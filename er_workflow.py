import customtkinter as ctk
import pandas as pd
from tkinter import filedialog, messagebox
from pyjedai.datamodel import Data
from pyjedai.clustering import UniqueMappingClustering, ConnectedComponentsClustering
from er_execution import ERExecution

class ERWorkflow:
    main_frame : ctk.CTkFrame
    next_frame : ERExecution
    data : Data
    
    def __init__(self, master, color):
        self.master = master
        self.main_frame = ctk.CTkFrame(master, fg_color=color)


    def filtering_step(self):
        self.frame_filter_section = ctk.CTkFrame(self.scroll_container, fg_color="transparent")
        self.frame_filter_section.pack(anchor="w", fill="x", pady=(10, 20))

        lbl_filter = ctk.CTkLabel(self.frame_filter_section, text="--- FILTERING ALGORITHM ---", font=("Courier", 14, "bold"), text_color="#39ff14")
        lbl_filter.pack(anchor="w", pady=(0, 5))

        self.dropdown_filter = ctk.CTkOptionMenu(
            self.frame_filter_section,
            values=["StandardBlocking", "KNN Search"],
            fg_color="#333333", button_color="#00ffcc", button_hover_color="#004d40", text_color="white",
            command=self.toggle_knn_options  # <--- Triggers the KNN menu
        )
        self.dropdown_filter.pack(anchor="w")

        # --- KNN OPTIONS CONTAINER (Starts Hidden) ---
        # I added a slight background color to make it look like a distinct sub-menu
        self.frame_knn_options = ctk.CTkFrame(self.frame_filter_section, fg_color="#111111", corner_radius=5)
        
        # Row 1: Metric & K
        row1 = ctk.CTkFrame(self.frame_knn_options, fg_color="transparent")
        row1.pack(fill="x", pady=(10, 5), padx=10)
        
        ctk.CTkLabel(row1, text="Metric:", font=("Courier", 12)).pack(side="left", padx=(0, 5))
        self.knn_metric = ctk.CTkOptionMenu(row1, values=['cosine', 'dice', 'jaccard'], width=120, fg_color="#333333", button_color="#00ffcc")
        self.knn_metric.pack(side="left", padx=(0, 20))

        ctk.CTkLabel(row1, text="K (int):", font=("Courier", 12)).pack(side="left", padx=(0, 5))
        self.knn_k = ctk.CTkEntry(row1, placeholder_text="e.g., 5", width=60, border_color="#333333")
        self.knn_k.pack(side="left")

        # Row 2: Tokenization & Q-Grams
        row2 = ctk.CTkFrame(self.frame_knn_options, fg_color="transparent")
        row2.pack(fill="x", pady=5, padx=10)

        ctk.CTkLabel(row2, text="Tokenization:", font=("Courier", 12)).pack(side="left", padx=(0, 5))
        self.knn_tokenization = ctk.CTkOptionMenu(
            row2, 
            values=['standard', 'qgrams', 'standard_multiset', 'qgrams_multiset'], 
            width=160, fg_color="#333333", button_color="#00ffcc",
            command=self.toggle_qgram_options # <--- Triggers the Q-gram input
        )
        self.knn_tokenization.pack(side="left", padx=(0, 20))

        # This specific sub-frame holds the q-gram number, starting hidden
        self.frame_qgram = ctk.CTkFrame(row2, fg_color="transparent")
        ctk.CTkLabel(self.frame_qgram, text="N-Grams:", font=("Courier", 12)).pack(side="left", padx=(0, 5))
        self.knn_qgram_num = ctk.CTkEntry(self.frame_qgram, placeholder_text="e.g., 3", width=60, border_color="#333333")
        self.knn_qgram_num.pack(side="left")

        
    
    
   
    def llm_selection_step(self):
        # 1. Main Wrapper for the whole LLM section
        self.frame_llm_section = ctk.CTkFrame(self.scroll_container, fg_color="transparent")
        self.frame_llm_section.pack(anchor="w", fill="x", pady=(10, 20))

        lbl_section_title = ctk.CTkLabel(self.frame_llm_section, text="--- LANGUAGE MODEL & STRATEGY ---", font=("Courier", 14, "bold"), text_color="#39ff14")
        lbl_section_title.pack(anchor="w", pady=(0, 5))

        # 2. Horizontal Row for the two dropdowns
        row_dropdowns = ctk.CTkFrame(self.frame_llm_section, fg_color="transparent")
        row_dropdowns.pack(anchor="w", fill="x")

        # --- LEFT SIDE: LLM Selection ---
        frame_llm = ctk.CTkFrame(row_dropdowns, fg_color="transparent")
        frame_llm.pack(side="left", padx=(0, 20)) # padx gives space between the two dropdowns

        lbl_llm = ctk.CTkLabel(frame_llm, text="Model:", font=("Courier", 12))
        lbl_llm.pack(anchor="w")

        self.dropdown_llm = ctk.CTkOptionMenu(
            frame_llm,
            values=[ "gemma3n", "phi3", "qwen2.5", "llama3.1", "orca2", "openhermes", "zephyr"],
            fg_color="#333333", button_color="#00ffcc", button_hover_color="#004d40", text_color="white"
        )
        self.dropdown_llm.pack(anchor="w")

        # --- RIGHT SIDE: Strategy Selection ---
        frame_strategy = ctk.CTkFrame(row_dropdowns, fg_color="transparent")
        frame_strategy.pack(side="left")

        lbl_strategy = ctk.CTkLabel(frame_strategy, text="Strategy:", font=("Courier", 12))
        lbl_strategy.pack(anchor="w")

        self.dropdown_strategy = ctk.CTkOptionMenu(
            frame_strategy,
            values=["ZERO SHOT", "FEW SHOT"],
            fg_color="#333333", button_color="#00ffcc", button_hover_color="#004d40", text_color="white",
            command=self.toggle_few_shot_options # <--- Triggers the hidden menu
        )
        self.dropdown_strategy.pack(anchor="w")

        # ==========================================
        #       FEW SHOT OPTIONS (Starts Hidden)
        # ==========================================
        # Added a dark background to make it look like a sub-menu
        self.frame_fs_options = ctk.CTkFrame(self.frame_llm_section, fg_color="#111111", corner_radius=5)
        
        row_fs = ctk.CTkFrame(self.frame_fs_options, fg_color="transparent")
        row_fs.pack(fill="x", pady=10, padx=10)

        # Input for Number of Examples
        ctk.CTkLabel(row_fs, text="Num Examples:", font=("Courier", 12)).pack(side="left", padx=(0, 5))
        self.entry_fs_count = ctk.CTkEntry(row_fs, placeholder_text="e.g., 5", width=70, border_color="#333333")
        self.entry_fs_count.pack(side="left", padx=(0, 20))

        # Dropdown for Order
        ctk.CTkLabel(row_fs, text="Order:", font=("Courier", 12)).pack(side="left", padx=(0, 5))
        self.dropdown_fs_order = ctk.CTkOptionMenu(
            row_fs,
            values=["True/False", "False/True"],
            fg_color="#333333", button_color="#00ffcc", width=120
        )
        self.dropdown_fs_order.pack(side="left")
        
        
    def system_prompt_step(self):
        lbl_prompt = ctk.CTkLabel(self.scroll_container, text="--- SYSTEM PROMPT ---", font=("Courier", 14, "bold"),
                                  text_color="#39ff14")
        lbl_prompt.pack(anchor="w", pady=(10, 5))

        self.textbox_prompt = ctk.CTkTextbox(
            self.scroll_container,
            height=100,
            width=600,
            border_color="#333333", border_width=1, fg_color="#0a0a0a", text_color="#00ffcc"
        )
        self.textbox_prompt.pack(anchor="w", pady=(0, 20))
        self.textbox_prompt.insert("0.0", "You are given two record descriptions and your task is to identify\n\
            if the records refer to the same entity or not.")

    def prompting_strategy_step(self):
        lbl_strategy = ctk.CTkLabel(self.scroll_container, text="--- PROMPTING STRATEGY ---", font=("Courier", 14, "bold"),
                                    text_color="#39ff14")
        lbl_strategy.pack(anchor="w", pady=(10, 5))

        # Segmented button acts like a sleek toggle switch
        self.seg_strategy = ctk.CTkSegmentedButton(
            self.scroll_container,
            values=["Zero-Shot (ZS)", "Few-Shot (FS)"],
            command=self.toggle_fs_options,  # This dynamically shows/hides the dropdown below
            selected_color="#00ffcc", selected_hover_color="#004d40", unselected_color="#333333"
        )
        self.seg_strategy.pack(anchor="w", pady=(0, 10))
        self.seg_strategy.set("Zero-Shot (ZS)")  # Default selection

        # This frame holds the True/False options, but starts hidden
        self.frame_fs_options = ctk.CTkFrame(self.scroll_container, fg_color="transparent")

        lbl_fs_order = ctk.CTkLabel(self.frame_fs_options, text="Select Example Order:", font=("Courier", 12))
        lbl_fs_order.pack(side="left", padx=(0, 10))

        self.dropdown_fs_order = ctk.CTkOptionMenu(
            self.frame_fs_options,
            values=["True/False", "False/True"],
            fg_color="#333333", button_color="#00ffcc"
        )
        self.dropdown_fs_order.pack(side="left")
        
    def build(self):
        # 1. Main Scrollable Container
        # We use a scrollable frame because configuration pages get tall quickly!
        self.scroll_container = ctk.CTkScrollableFrame(self.main_frame, fg_color="transparent")
        self.scroll_container.pack(fill="both", expand=True, padx=40, pady=20)
        
        # --- THE MouseWheel FIX: Listen for mouse wheel scrolling ---
        # Windows & macOS use <MouseWheel>
        self.master.bind_all("<MouseWheel>", self.scroll_with_mousewheel)
        # Linux uses Button-4 (up) and Button-5 (down)
        self.master.bind_all("<Button-4>", self.scroll_with_mousewheel)
        self.master.bind_all("<Button-5>", self.scroll_with_mousewheel)

        lbl_title = ctk.CTkLabel(
            self.scroll_container,
            text="[ SYSTEM: CONFIGURE ER WORKFLOW ]",
            font=("Courier", 20, "bold"), text_color="#00ffcc"
        )
        lbl_title.pack(pady=(0, 30))

        # ==========================================
        #             1. FILTERING STEP
        # ==========================================
        self.filtering_step()  
        # ==========================================
        #             2. LLM SELECTION
        # ==========================================
        self.llm_selection_step()

        # ==========================================
        #             3. SYSTEM PROMPT
        # ==========================================
        self.system_prompt_step()
        # ==========================================
        #             4. PROMPTING STRATEGY (ZS / FS)
        # ==========================================
        # self.prompting_strategy_step()

        # ==========================================
        #        5. CLUSTERING (CONDITIONAL)
        # ==========================================
        # Only build this section if it is NOT a "dirty ER" task
    
        lbl_cluster = ctk.CTkLabel(self.scroll_container, text="--- CLUSTERING SETTINGS ---",
                                    font=("Courier", 14, "bold"), text_color="#39ff14")
        lbl_cluster.pack(anchor="w", pady=(30, 5))

        # 1. Create the invisible horizontal row
        row_clustering = ctk.CTkFrame(self.scroll_container, fg_color="transparent")
        row_clustering.pack(anchor="w", fill="x", pady=(0, 20))

        # 2. LEFT SIDE: The Dropdown
        frame_dropdown = ctk.CTkFrame(row_clustering, fg_color="transparent")
        frame_dropdown.pack(side="left", padx=(0, 30)) # padx pushes the next item 30px to the right

        ctk.CTkLabel(frame_dropdown, text="Algorithm:", font=("Courier", 12)).pack(anchor="w")
        self.dropdown_cluster = ctk.CTkOptionMenu(
            frame_dropdown,
            values=["Connected Components", "Unique Mapping Clustering"],
            fg_color="#333333",  button_color="#00ffcc", button_hover_color="#004d40", text_color="white"
        )
        self.dropdown_cluster.pack(anchor="w")

        # 3. RIGHT SIDE: The Similarity Input
        frame_sim = ctk.CTkFrame(row_clustering, fg_color="transparent")
        frame_sim.pack(side="left")

        ctk.CTkLabel(frame_sim, text="Sim Threshold (float):", font=("Courier", 12)).pack(anchor="w")
        self.entry_cluster_threshold = ctk.CTkEntry(
            frame_sim, 
            placeholder_text="e.g., 0.75", 
            width=160, 
            border_color="#333333"
        )
        self.entry_cluster_threshold.pack(anchor="w")
        
        
        # ==========================================
        #             EXECUTE BUTTON
        # ==========================================
        btn_start_er = ctk.CTkButton(
            self.scroll_container,
            command=self.init_workflow,
            text="[ INITIALIZE ER WORKFLOW ]", font=("Courier", 16, "bold"),
            fg_color="transparent", border_width=2, text_color="#00ffcc", border_color="#00ffcc", hover_color="#004d40",
            width=300, height=50
        )
        btn_start_er.pack(pady=40)        
    
    def init_workflow(self):
        """Gathers all UI parameters, formats them safely, and stores them in a dictionary."""
        try:
            
            df_1 = pd.read_csv("data/D2/abtclean.csv", sep="|").astype(str)
            df_2 = pd.read_csv("data/D2/buyclean.csv", sep="|").astype(str)
            
            gt = pd.read_csv("data/D2/gtclean.csv", sep="|").astype(str)
            self.data = Data(dataset_1=df_1, dataset_2=df_2, id_column_name_1="id", id_column_name_2="id", ground_truth=gt)
            
            
            
            # This will store all our extracted settings
            self.workflow_params = {}

            # --- 1. FILTERING ---
            filter_algo = self.dropdown_filter.get()
            self.workflow_params["filtering_algorithm"] = filter_algo

            if filter_algo == "KNN Search":
                self.workflow_params["knn_metric"] = self.knn_metric.get()
                
                # Safely parse K
                k_val = self.knn_k.get()
                self.workflow_params["knn_k"] = int(k_val) if k_val.isdigit() else 5
                
                # Safely parse tokenization
                tok_val = self.knn_tokenization.get()
                self.workflow_params["knn_tokenization"] = tok_val
                
                if "qgrams" in tok_val:
                    q_val = self.knn_qgram_num.get()
                    self.workflow_params["knn_qgrams"] = int(q_val) if q_val.isdigit() else 3
                

            # --- 2. LLM & STRATEGY ---
            self.workflow_params["llm_model"] = self.dropdown_llm.get()
            
            strategy = self.dropdown_strategy.get()
            self.workflow_params["strategy"] = strategy

            if strategy == "FEW SHOT":
                fs_count = self.entry_fs_count.get()
                self.workflow_params["few_shot_count"] = int(fs_count) if fs_count.isdigit() else 5
                self.workflow_params["few_shot_order"] = self.dropdown_fs_order.get()

            # --- 3. SYSTEM PROMPT ---
            # Extract from line 0, character 0 to the end, and strip trailing whitespace
            self.workflow_params["system_prompt"] = self.textbox_prompt.get("0.0", "end").strip()

            # --- 4. CLUSTERING ---
            self.workflow_params["clustering_algorithm"] = self.dropdown_cluster.get()
            
            cluster_thresh = self.entry_cluster_threshold.get()
            self.workflow_params["clustering_threshold"] = float(cluster_thresh) if cluster_thresh else 0.75

            # =========================================
            # SUCCESS OUTPUT
            # =========================================
            
            
            
            print("\n[ SYSTEM LOG ]: WORKFLOW PARAMETERS INITIALIZED")
            print("==================================================")
            for key, value in self.workflow_params.items():
                print(f"{key.upper()}: {value}")
            print("==================================================\n")
           
           
            self.main_frame.forget()
            self.next_frame.data = self.data
            self.next_frame.workflow_params = self.workflow_params
            self.next_frame.main_frame.pack(fill="both", expand=True)
            self.next_frame.start_processing()
            
            # Optional: Show a UI popup confirming success
            # messagebox.showinfo("System Link", "ER Workflow successfully initialized!")

            # NOTE: You can now pass `self.workflow_params` into your pyjedai logic!

        except ValueError:
            # This triggers if float() fails (e.g., they typed "abc" into the threshold box)
            messagebox.showerror("Data Error", "Invalid input detected. Please ensure your thresholds are formatted as valid numbers (e.g., 0.75).")
        
    
    def toggle_fs_options(self, value):
        """Dynamically shows or hides the FS order dropdown based on strategy selection."""
        if value == "Few-Shot (FS)":
            self.frame_fs_options.pack(anchor="w", pady=(0, 20))
        else:
            self.frame_fs_options.pack_forget()

    def update_slider_label(self, value):
        """Updates the text label live while dragging the slider."""
        # Format the float to 2 decimal places
        self.lbl_threshold_val.configure(text=f"Similarity Threshold: {value:.2f}")

    def toggle_knn_options(self, value):
        """Shows or hides the KNN settings box based on the filter selection."""
        if value == "KNN Search":
            # Pack it slightly indented with pady to look like a dropdown section
            self.frame_knn_options.pack(anchor="w", fill="x", pady=(10, 0), padx=(20, 0))
            
            # Immediately check if qgrams is the default so it paints correctly
            self.toggle_qgram_options(self.knn_tokenization.get())
        else:
            self.frame_knn_options.pack_forget()

    def toggle_qgram_options(self, value):
        """Shows the Q-Gram number input only if a qgram tokenization is selected."""
        if "qgrams" in value:
            self.frame_qgram.pack(side="left")
        else:
            self.frame_qgram.pack_forget()

    def toggle_few_shot_options(self, value):
        """Shows or hides the Few Shot settings based on strategy selection."""
        if value == "FEW SHOT":
            # Indent it slightly with padx to look like a nested setting
            self.frame_fs_options.pack(anchor="w", fill="x", pady=(10, 0), padx=(20, 0))
        else:
            # Hide it if ZERO SHOT is selected
            self.frame_fs_options.pack_forget()
    
    
    
    def scroll_with_mousewheel(self, event):
        """Forces the scrollable frame to move when the mouse wheel is spun."""
        try:
            # For Windows and macOS
            if event.delta:
                # event.delta is usually 120 or -120. We divide by 120 to move 1 unit.
                self.scroll_container._parent_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            
            # For Linux
            elif event.num == 4:
                self.scroll_container._parent_canvas.yview_scroll(-1, "units")
            elif event.num == 5:
                self.scroll_container._parent_canvas.yview_scroll(1, "units")
                
        except Exception:
            # Pass silently if the scroll container doesn't exist yet or is hidden
            pass
        
    
