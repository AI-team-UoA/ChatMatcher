from concurrent.futures import ThreadPoolExecutor, as_completed

import customtkinter as ctk
import ollama

import numpy as np
from pyjedai.datamodel import Data
from pyjedai.block_building import StandardBlocking
from pyjedai.joins import TopKJoin
from pyjedai.block_cleaning import BlockFiltering
from pyjedai.comparison_cleaning import WeightedEdgePruning
from pyjedai.clustering import UniqueMappingClustering, ConnectedComponentsClustering
from pyjedai.llm_matching import OllamaMatching
import networkx

import threading

from er_final import ERFinal

class ERExecution:
    main_frame : ctk.CTkFrame
    next_frame : ERFinal
    data : Data
    workflow_params : dict

    def __init__(self, master, color):
        self.master = master
        self.main_frame = ctk.CTkFrame(master, fg_color=color)
        self.workflow_params = {}

    def build(self):
        """Builds the UI for the execution screen."""
        # 1. Title
        lbl_title = ctk.CTkLabel(
            self.main_frame,
            text="[ SYSTEM: EXECUTING ER WORKFLOW ]",
            font=("Courier", 24, "bold"), text_color="#00ffcc"
        )
        lbl_title.pack(pady=(40, 20))

        # 2. The Progress Bar (Replaces tqdm)
        self.progress_bar = ctk.CTkProgressBar(
            self.main_frame,
            width=600,
            height=20,
            progress_color="#39ff14", # Hacker green
            fg_color="#333333"
        )
        self.progress_bar.pack(pady=20)
        self.progress_bar.set(0) # Start at 0%

        # Percentage Label
        self.lbl_percentage = ctk.CTkLabel(self.main_frame, text="0%", font=("Courier", 16, "bold"), text_color="#39ff14")
        self.lbl_percentage.pack(pady=(0, 20))

        # 3. Live Console / Log Output
        self.console_output = ctk.CTkTextbox(
            self.main_frame,
            width=700,
            height=300,
            font=("Consolas", 13),
            fg_color="#0a0a0a", text_color="#00ffcc",
            state="disabled" # Keep disabled so user can't type in it
        )
        self.console_output.pack(pady=10)


    def start_processing(self):
        """Kicks off the background thread so the GUI doesn't freeze."""

        self.log_to_console("> Initializing background thread...")
        self.log_to_console(f"> Model Selected: {self.workflow_params.get('llm_model')}")

        # Create a "daemon" thread (meaning if the user closes the app, the thread dies with it safely)
        process_thread = threading.Thread(target=self.run_heavy_workflow, daemon=True)
        process_thread.start()


    def transition_to_final(self):
        self.main_frame.forget() # Remove the execution screen


        self.next_frame = ERFinal(self.master, "transparent")
        self.next_frame = self.next_frame
        self.next_frame.llms_df = self.llm_pairs
        self.next_frame.final_df = self.final_pairs_df

        self.next_frame.build()

        self.next_frame.main_frame.pack(fill="both", expand=True) # Show the final screen




    def run_blocking(self):
        edges = []
        weights = []

        if self.workflow_params['filtering_algorithm'] == 'StandardBlocking':
            self.log_to_console("> Running Standard Blocking...")

            st = StandardBlocking(disable_ray=True)
            blocks = st.build_blocks(self.data)


            block_cleaning = BlockFiltering(ratio=0.9)
            cleaned_blocks = block_cleaning.process(blocks, self.data)

            wep = WeightedEdgePruning(weighting_scheme='EJS')
            cc_blocks = wep.process(cleaned_blocks, self.data)


            ev = wep.evaluate(cc_blocks)

            self.log_to_console(u'\u2500' * 123)
            self.log_to_console("Filtering Performance:\n\tPrecision: {:9.2f}% \n\tRecall:    {:9.2f}%\n\tF1-score:  {:9.2f}%".format(ev['Precision %'], ev['Recall %'], ev['F1 %']))
            self.log_to_console(u'\u2500' * 123)

            for node_1, blocks in cc_blocks.items():
                for node_2 in blocks:
                    edges.append((node_1, node_2))
                    weights.append(wep._get_weight(node_1, node_2))

            edges = np.array(edges)
            weights = np.array(weights)

            w_min = weights.min()
            w_max = weights.max()

            if w_min == w_max:
                weights = np.ones_like(weights)  # Avoid division by zero; all weights are the same
            elif w_max > 1 or w_min < 0:
                weights = (weights - w_min) / (w_max - w_min)
        else:
            self.log_to_console("> Running TopKJoin...")
            metric = self.workflow_params["knn_metric"]
            k = self.workflow_params["knn_k"]
            tokenization = self.workflow_params["knn_tokenization"]
            q = 2
            if "knn_qgrams" in self.workflow_params:
                q = self.workflow_params["knn_qgrams"]

            topk = TopKJoin(K=k, metric=metric, tokenization=tokenization, qgrams=q)
            graph = topk.fit(self.data)

            for u, v, w in graph.edges(data='weight'):
                edges.append((u, v))
                weights.append(w)

            edges  = np.array(edges)
            weights = np.array(weights)

        weights_sorted_indices = np.argsort(weights)[::-1] # Sort descending
        edges = edges[weights_sorted_indices]
        weights = weights[weights_sorted_indices]

        return edges, weights

    def create_examples(self, edges):
        number_of_examples = self.workflow_params["few_shot_count"]

        final_edges = np.array([
            [self.data._gt_to_ids_reversed_1[e1], self.data._gt_to_ids_reversed_2[e2]]
                if e1 < e2
                else
                    [self.data._gt_to_ids_reversed_1[e2],self.data._gt_to_ids_reversed_2[e1]]
                for e1, e2 in edges
        ])

        true_examples = []
        false_examples = []

        gt_set = set(tuple(x) for x in self.data.ground_truth.values)

        for pair in final_edges:
            if tuple(pair) in gt_set:
                true_examples.append(pair)
                if len(true_examples) >= number_of_examples:
                    break

        for pair in final_edges[::-1]:
            if tuple(pair) not in gt_set:
                false_examples.append(pair)
                if len(false_examples) >= number_of_examples:
                    break

        return true_examples, false_examples

    def run_heavy_workflow(self):
        """
        THIS RUNS IN THE BACKGROUND.
        Put your PyJedai code here. Do not put GUI creation code here.
        """
        self.log_to_console("> Beginning Entity Resolution...\n")

        # --- SIMULATION OF YOUR TQDM LOOP ---

        # df_1 = pd.read_csv("../data/D2/abtclean.csv", sep="|")
        # df_2 =

        edges, weights = self.run_blocking()


        graph = networkx.Graph()
        for i, pair in enumerate(edges):
            graph.add_edge(pair[0], pair[1], weight=weights[i])


        self.log_to_console(f"> Total candidate pairs generated: {edges.shape[0]}")

        self.log_to_console("> Starting LLM-based classification of candidate pairs...")

        suffix = 'z'

        examples = {}
        if self.workflow_params["strategy"] == "FEW SHOT":
            true_examples, false_examples = self.create_examples(edges)
            if not true_examples or not false_examples:
                self.log_to_console("> Not enough examples for few-shot prompting.")
                self.log_to_console("> Continuing with zero-shot prompting instead.")
            else:
                if self.workflow_params["few_shot_order"] == "TRUE FALSE":
                    suffix = "tf"
                else:
                    suffix = "ft"
                examples = { 'true' : true_examples, 'false' : false_examples }


        total_steps = edges.shape[0]
        final_graph = networkx.Graph()

        pairs = []

        matcher = OllamaMatching(llm_model=self.workflow_params["llm_model"])

        prompt, model = matcher.build_prompt(prediction=graph,
                                            data=self.data,
                                            system_prompt=self.workflow_params["system_prompt"],
                                            examples=examples, suffix=suffix)

        self.log_to_console(f"> Prompt built.\n{prompt}\n\nStarting classification...")
        self.log_to_console(f"> Model --- {model} ---")
        batch_size = self.workflow_params["batch_size"]
        print(batch_size)
        completed_steps = 0

        # for step in range(total_steps):
        #     pair = edges[step]
        #     w = weights[step]
        #     result = matcher.chat_pair(pair)
        #     if result:
        #         pairs.append((pair[0], pair[1]))
        #         final_graph.add_edge(pair[0], pair[1], weight=w)

        #     completed_steps += 1
        #     progress_float = completed_steps / total_steps
        #     self.update_progress(progress_float)

        #     # self.progress_bar.set(progress_float)
        #     # self.lbl_percentage.configure(text=f"{int(progress_float * 100)}%")

        #     # Simulate a log every 20 steps
        #     if completed_steps % 20 == 0:
        #         self.log_to_console(f"[*] Processed batch {completed_steps} / {total_steps}...")

        with ThreadPoolExecutor(max_workers=batch_size) as executor:
            future_to_edge = {}

            for step in range(total_steps):
                pair = edges[step]
                w = weights[step]
                future = executor.submit(matcher.chat_pair, pair)
                future_to_edge[future] = (pair, w)

            for future in as_completed(future_to_edge):
                pair, weight = future_to_edge[future]
                try:
                    result = future.result()
                    if result:
                        if pair[0] < pair[1]:
                            pairs.append((int(pair[0]), int(pair[1])))
                            final_graph.add_edge(int(pair[0]), int(pair[1]), weight=weight)
                        else:
                            pairs.append((int(pair[1]), int(pair[0])))
                            final_graph.add_edge(int(pair[1]), int(pair[0]), weight=weight)
                except Exception as e:
                    self.log_to_console(f"> Error processing pair {pair}: {str(e)}")
                completed_steps += 1
                progress_float = completed_steps / total_steps
                # self.progress_bar.set(progress_float)
                # self.lbl_percentage.configure(text=f"{int(progress_float * 100)}%")
                self.update_progress(progress_float)

        #     # Simulate a log every 20 steps
                if completed_steps % 20 == 0:
                    self.log_to_console(f"[*] Processed batch {completed_steps} / {total_steps}...")

        if completed_steps % 20 != 0:
            self.log_to_console(f"[*] Processed batch {total_steps} / {total_steps}...")


        ollama.delete(matcher.model_name)

        self.log_to_console(f"\n> [ SUCCESS ]: Found {len(pairs)} matches!")

        ev = matcher.evaluate(pairs)

        self.log_to_console(u'\u2500' * 123)
        self.log_to_console("LLM Matching Performance:\n\tPrecision: {:9.2f}% \n\tRecall:    {:9.2f}%\n\tF1-score:  {:9.2f}%".format(ev['Precision %'], ev['Recall %'], ev['F1 %']))
        self.log_to_console(u'\u2500' * 123)

        self.llm_pairs = matcher.export_to_df(pairs)

        self.log_to_console("> Starting clustering of matched pairs...")

        if self.workflow_params["clustering_algorithm"] == "Unique Mapping Clustering":
            self.log_to_console("> Running Unique Mapping Clustering...")


            umc = UniqueMappingClustering()
            clusters = umc.process(final_graph, self.data, self.workflow_params.get("clustering_threshold", 0.1))
            self.log_to_console(f"> Unique Mapping Clustering produced {len(clusters)} clusters.")
            ev = umc.evaluate(clusters)
            self.log_to_console(u'\u2500' * 123)
            self.log_to_console("Clustering Performance:\n\tPrecision: {:9.2f}% \n\tRecall:    {:9.2f}% \n\tF1-score:  {:9.2f}%".format(ev['Precision %'], ev['Recall %'], ev['F1 %']))
            self.log_to_console(u'\u2500' * 123)

            self.final_pairs_df = umc.export_to_df(clusters)
        elif self.workflow_params["clustering_algorithm"] == "Connected Components":
            self.log_to_console("> Running Connected Components Clustering...")
            ccc = ConnectedComponentsClustering()
            clusters = ccc.process(final_graph, data=self.data, threshold=self.workflow_params.get("clustering_threshold", 0.1))
            self.log_to_console(f"> Connected Components Clustering produced {len(clusters)} clusters.")
            ev = ccc.evaluate(clusters)
            self.log_to_console(u'\u2500' * 123)
            self.log_to_console("Clustering Performance:\n\tPrecision: {:9.2f}% \n\tRecall:    {:9.2f}% \n\tF1-score:  {:9.2f}%".format(ev['Precision %'], ev['Recall %'], ev['F1 %']))
            self.log_to_console(u'\u2500' * 123)

            self.final_pairs_df = ccc.export_to_df(clusters)
        else:
            self.log_to_console("> Skipping Clustering...")
            self.final_pairs_df = matcher.export_to_df(pairs)


        self.log_to_console("\n> Entity Resolution Workflow Complete!")

        self.main_frame.after(2000, self.transition_to_final)



        # for step in range(total_steps):
        #     time.sleep(0.05) # Simulating heavy LLM processing time

        #     # Calculate progress between 0.0 and 1.0

        #     # Update the progress bar and percentage label safely
        #     self.progress_bar.set(progress_float)
        #     self.lbl_percentage.configure(text=f"{int(progress_float * 100)}%")

        #     # Simulate a log every 20 steps
        #     if step % 20 == 0:
        #         self.log_to_console(f"[*] Processed batch {step} / {total_steps}...")

        # # --- WHEN FINISHED ---
        # self.log_to_console("\n> [ SUCCESS ]: Entity Resolution Complete!")
        # self.progress_bar.configure(progress_color="#00ffcc") # Change color to cyan when done

    def log_to_console(self, text):
        """Thread-safe method to request a console log."""
        # Schedule the actual GUI update on the main thread
        self.main_frame.after(0, self._gui_log, text)

    def _gui_log(self, text):
        """Actually modifies the GUI (must only run on main thread)."""
        self.console_output.configure(state="normal")
        self.console_output.insert("end", text + "\n")
        self.console_output.see("end")
        self.console_output.configure(state="disabled")

    def update_progress(self, progress_float):
        """Thread-safe method to update the progress bar."""
        self.main_frame.after(0, self._gui_update_progress, progress_float)

    def _gui_update_progress(self, progress_float):
        """Updates GUI elements (must only run on main thread)."""
        self.progress_bar.set(progress_float)
        self.lbl_percentage.configure(text=f"{int(progress_float * 100)}%")

    # def log_to_console(self, text):
    #     """Helper function to safely print to the GUI text box."""
    #     self.console_output.configure(state="normal") # Unlock
    #     self.console_output.insert("end", text + "\n") # Append text
    #     self.console_output.see("end") # Auto-scroll to the very bottom
    #     self.console_output.configure(state="disabled") # Lock