from distutils import command
from os import fpathconf
from tabnanny import filename_only

import customtkinter as ctk
from tkinter import filedialog, messagebox
import pandas as pd

ctk.set_appearance_mode("dark")  # Forces dark mode
ctk.set_default_color_theme("blue")  # Base theme

class ChatMatcherApp:
    root : ctk.CTk

    def __init__(self, root : ctk.CTk):
        self.root = root
        self.root.title("ChatMatcher")
        self.root.geometry("700x450")


        self.choose_linkage_type = ctk.CTkFrame(self.root, fg_color="transparent")
        self.build_choose_linkage_type()


        # Load Entity Resolution

        self.er_dataloader = ctk.CTkFrame(self.root, fg_color="transparent")
        self.build_er_dataloader()

        self.er_workflow = ctk.CTkFrame(self.root, fg_color="transparent")
        self.build_er_workflow_screen()






        # self.choose_linkage_type.pack(fill="both", expand=True)
        self.er_dataloader.pack(fill="both", expand=True)
    #
    # def build_dataloader_screen(self):
    #
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

    def build_er_dataloader(self):
        container = ctk.CTkFrame(self.er_dataloader, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=10)  # Added slight padding to the main container

        lbl_title = ctk.CTkLabel(container, text="Choose your dataset for Entity Resolution",
                                 font=("Courier", 15, "bold"), text_color="#00ffcc")
        lbl_title.pack(pady=(10, 20))

        # ==========================================
        #              CONTINUE BUTTON
        # ==========================================
        continue_container = ctk.CTkFrame(container, fg_color="transparent")
        continue_container.pack(side="bottom", fill="x", pady=20)

        btn_continue = ctk.CTkButton(continue_container, text="[ CONTINUE ]", font=("Courier", 16, "bold"),
                                     fg_color="#333333", border_width=2, text_color="#00ffcc", border_color="#00ffcc",
                                     hover_color="#004d40", command=self.go_to_workflow)
        btn_continue.pack()

        # --- DATASET CONTAINERS ---
        # Removed the red/green debug colors, kept them transparent
        dataset_container_1 = ctk.CTkFrame(container, fg_color="transparent")
        dataset_container_1.pack(side="left", expand=True, fill="both", padx=5)

        dataset_container_2 = ctk.CTkFrame(container, fg_color="transparent")
        dataset_container_2.pack(side="left", expand=True, fill="both", padx=5)

        dataset_container_3 = ctk.CTkFrame(container, fg_color="transparent")
        dataset_container_3.pack(side="left", expand=True, fill="both", padx=5)

        # ==========================================
        #                 DATASET 1
        # ==========================================
        dt1_lbl = ctk.CTkLabel(dataset_container_1, text="--- LOAD DATASET 1 ---", font=("Courier", 14, "bold"),
                               text_color="#00ffcc")
        dt1_lbl.pack(side="top", pady=(0, 15))

        self.entry_sep_1 = ctk.CTkEntry(dataset_container_1, placeholder_text="Separator (e.g., ',')", width=220,
                                        border_color="#333333")
        self.entry_sep_1.pack(pady=(0, 15))

        self.entry_id_1 = ctk.CTkEntry(dataset_container_1, placeholder_text="ID column (e.g., patient_id)", width=220,
                                       border_color="#333333")
        self.entry_id_1.pack(pady=20)

        btn_load_dataset_1 = ctk.CTkButton(dataset_container_1, text="[ UPLOAD ]", font=("Courier", 14, "bold"),
                                           fg_color="transparent", border_width=2, text_color="#00ffcc",
                                           border_color="#00ffcc", hover_color="#004d40",
                                           command=lambda: self.load_er_csv(dataset_num=1))
        btn_load_dataset_1.pack(pady=10)

        self.lbl_status_1 = ctk.CTkLabel(dataset_container_1, text="Status: Awaiting...", font=("Courier", 12),
                                         text_color="#f39c12")
        self.lbl_status_1.pack(pady=10)

        # ==========================================
        #                 DATASET 2
        # ==========================================
        dt2_lbl = ctk.CTkLabel(dataset_container_2, text="--- LOAD DATASET 2 ---", font=("Courier", 14, "bold"),
                               text_color="#00ffcc")
        dt2_lbl.pack(side="top", pady=(0, 15))

        self.entry_sep_2 = ctk.CTkEntry(dataset_container_2, placeholder_text="Separator (e.g., ',')", width=220,
                                        border_color="#333333")
        self.entry_sep_2.pack(pady=(0, 15))

        self.entry_id_2 = ctk.CTkEntry(dataset_container_2, placeholder_text="ID column (e.g., patient_id)", width=220,
                                       border_color="#333333")
        self.entry_id_2.pack(pady=20)

        btn_load_dataset_2 = ctk.CTkButton(dataset_container_2, text="[ UPLOAD ]", font=("Courier", 14, "bold"),
                                           fg_color="transparent", border_width=2, text_color="#00ffcc",
                                           border_color="#00ffcc", hover_color="#004d40",
                                           command=lambda: self.load_er_csv(dataset_num=2))
        btn_load_dataset_2.pack(pady=10)

        self.lbl_status_2 = ctk.CTkLabel(dataset_container_2, text="Status: Awaiting...", font=("Courier", 12),
                                         text_color="#f39c12")
        self.lbl_status_2.pack(pady=10)

        # ==========================================
        #               GROUND TRUTH
        # ==========================================
        gt_lbl = ctk.CTkLabel(dataset_container_3, text="--- GROUND TRUTH ---", font=("Courier", 14, "bold"),
                              text_color="#00ffcc")
        gt_lbl.pack(side="top", pady=(0, 15))

        self.entry_sep_gt = ctk.CTkEntry(dataset_container_3, placeholder_text="Separator (e.g., ',')", width=220,
                                         border_color="#333333")
        self.entry_sep_gt.pack(pady=(0, 15))

        # --- THE MAGIC ALIGNMENT SPACER ---
        # This empty frame mimics the exact height and padding of the ID input boxes
        # to ensure the buttons below it stay perfectly aligned.
        spacer = ctk.CTkFrame(dataset_container_3, width=220, height=28, fg_color="transparent")
        spacer.pack(pady=20)

        btn_load_dataset_gt = ctk.CTkButton(dataset_container_3, text="[ UPLOAD ]", font=("Courier", 14, "bold"),
                                            fg_color="transparent", border_width=2, text_color="#00ffcc",
                                            border_color="#00ffcc", hover_color="#004d40",
                                            command=lambda: self.load_er_csv(dataset_num=3))
        btn_load_dataset_gt.pack(pady=10)

        self.lbl_status_gt = ctk.CTkLabel(dataset_container_3, text="Status: Awaiting...", font=("Courier", 12),
                                          text_color="#f39c12")
        self.lbl_status_gt.pack(pady=10)

    def build_er_workflow_screen(self):
        # 1. Main Scrollable Container
        # We use a scrollable frame because configuration pages get tall quickly!
        scroll_container = ctk.CTkScrollableFrame(self.er_workflow, fg_color="transparent")
        scroll_container.pack(fill="both", expand=True, padx=40, pady=20)

        lbl_title = ctk.CTkLabel(
            scroll_container,
            text="[ SYSTEM: CONFIGURE ER WORKFLOW ]",
            font=("Courier", 20, "bold"), text_color="#00ffcc"
        )
        lbl_title.pack(pady=(0, 30))

        # ==========================================
        #             1. FILTERING STEP
        # ==========================================
        lbl_filter = ctk.CTkLabel(scroll_container, text="--- FILTERING ALGORITHM ---", font=("Courier", 14, "bold"),
                                  text_color="#39ff14")
        lbl_filter.pack(anchor="w", pady=(10, 5))

        self.dropdown_filter = ctk.CTkOptionMenu(
            scroll_container,
            values=["StandardBlocking", "KNN Search"],
            fg_color="#333333", button_color="#00ffcc", button_hover_color="#004d40", text_color="white"
        )
        self.dropdown_filter.pack(anchor="w", pady=(0, 20))

        # ==========================================
        #             2. LLM SELECTION
        # ==========================================
        lbl_llm = ctk.CTkLabel(scroll_container, text="--- LARGE LANGUAGE MODEL ---", font=("Courier", 14, "bold"),
                               text_color="#39ff14")
        lbl_llm.pack(anchor="w", pady=(10, 5))

        self.dropdown_llm = ctk.CTkOptionMenu(
            scroll_container,
            values=["qwen2.5", "llama3", "gpt-4o", "claude-3.5-sonnet"],
            fg_color="#333333", button_color="#00ffcc", button_hover_color="#004d40", text_color="white"
        )
        self.dropdown_llm.pack(anchor="w", pady=(0, 20))

        # ==========================================
        #             3. SYSTEM PROMPT
        # ==========================================
        lbl_prompt = ctk.CTkLabel(scroll_container, text="--- SYSTEM PROMPT ---", font=("Courier", 14, "bold"),
                                  text_color="#39ff14")
        lbl_prompt.pack(anchor="w", pady=(10, 5))

        self.textbox_prompt = ctk.CTkTextbox(
            scroll_container,
            height=100,
            width=600,
            border_color="#333333", border_width=1, fg_color="#0a0a0a", text_color="#00ffcc"
        )
        self.textbox_prompt.pack(anchor="w", pady=(0, 20))
        self.textbox_prompt.insert("0.0", "You are an expert Entity Resolution assistant...")

        # ==========================================
        #             4. PROMPTING STRATEGY (ZS / FS)
        # ==========================================
        lbl_strategy = ctk.CTkLabel(scroll_container, text="--- PROMPTING STRATEGY ---", font=("Courier", 14, "bold"),
                                    text_color="#39ff14")
        lbl_strategy.pack(anchor="w", pady=(10, 5))

        # Segmented button acts like a sleek toggle switch
        self.seg_strategy = ctk.CTkSegmentedButton(
            scroll_container,
            values=["Zero-Shot (ZS)", "Few-Shot (FS)"],
            command=self.toggle_fs_options,  # This dynamically shows/hides the dropdown below
            selected_color="#00ffcc", selected_hover_color="#004d40", unselected_color="#333333"
        )
        self.seg_strategy.pack(anchor="w", pady=(0, 10))
        self.seg_strategy.set("Zero-Shot (ZS)")  # Default selection

        # This frame holds the True/False options, but starts hidden
        self.frame_fs_options = ctk.CTkFrame(scroll_container, fg_color="transparent")

        lbl_fs_order = ctk.CTkLabel(self.frame_fs_options, text="Select Example Order:", font=("Courier", 12))
        lbl_fs_order.pack(side="left", padx=(0, 10))

        self.dropdown_fs_order = ctk.CTkOptionMenu(
            self.frame_fs_options,
            values=["True/False", "False/True"],
            fg_color="#333333", button_color="#00ffcc"
        )
        self.dropdown_fs_order.pack(side="left")

        # ==========================================
        #        5. CLUSTERING (CONDITIONAL)
        # ==========================================
        # Only build this section if it is NOT a "dirty ER" task
        if not getattr(self, "dirty_er", True):
            lbl_cluster = ctk.CTkLabel(scroll_container, text="--- CLUSTERING SETTINGS ---",
                                       font=("Courier", 14, "bold"), text_color="#ff00cc")
            lbl_cluster.pack(anchor="w", pady=(30, 5))

            self.dropdown_cluster = ctk.CTkOptionMenu(
                scroll_container,
                values=["Connected Components", "Agglomerative", "DBSCAN"],
                fg_color="#333333", button_color="#ff00cc", button_hover_color="#880066"
            )
            self.dropdown_cluster.pack(anchor="w", pady=(0, 15))

            # Similarity Threshold Slider
            self.lbl_threshold_val = ctk.CTkLabel(scroll_container, text="Similarity Threshold: 0.75",
                                                  font=("Courier", 12))
            self.lbl_threshold_val.pack(anchor="w")

            self.slider_threshold = ctk.CTkSlider(
                scroll_container,
                from_=0.0, to=1.0,
                number_of_steps=100,
                command=self.update_slider_label,  # Updates the text live as you drag
                button_color="#ff00cc", button_hover_color="#880066", progress_color="#ff00cc"
            )
            self.slider_threshold.set(0.75)
            self.slider_threshold.pack(anchor="w", pady=(5, 30))

        # ==========================================
        #             EXECUTE BUTTON
        # ==========================================
        btn_start_er = ctk.CTkButton(
            scroll_container, text="[ INITIALIZE ER WORKFLOW ]", font=("Courier", 16, "bold"),
            fg_color="transparent", border_width=2, text_color="#00ffcc", border_color="#00ffcc", hover_color="#004d40",
            width=300, height=50
        )
        btn_start_er.pack(pady=40)




    def build_choose_linkage_type(self):
        container = ctk.CTkFrame(self.choose_linkage_type, fg_color="transparent")
        container.pack(expand=True)

        lbl_title = ctk.CTkLabel(container,
                                 text="Welcome to ChatMatcher!",
                                 font=("Courier", 24, "bold"), text_color="#00ffcc")
        lbl_title.pack(pady=(0,10))
        text_preview = ctk.CTkLabel(container,
                                    text="\nContinue with Entity Resolution or Privacy-Preserving Record Linkage Workflow",
                                    font=("Courier", 24, "bold"), text_color="#00ffcc",
                                    wraplength=650)

        text_preview.pack(pady=(0, 30))

        btn_frame = ctk.CTkFrame(container, fg_color="transparent")
        btn_frame.pack()

        btn_er = ctk.CTkButton(
            btn_frame,
            text="[ ER ]",
            font=("Courier", 14, "bold"),
            command=self.go_to_er,
            text_color="#00ffcc",
            fg_color="transparent",  # Keeping that hollow neon terminal look
            border_width=2,
            border_color="#00ffcc",
            hover_color="#004d40"
        )
        btn_er.pack(side="left", padx=20)  # side="left" places them horizontally

        btn_pprl = ctk.CTkButton(
            btn_frame,
            text="[ PPRL ]",
            font=("Courier", 14, "bold"),
            text_color="#00ffcc",
            fg_color="transparent",
            border_width=2,
            border_color="#00ffcc",
            hover_color="#004d40"
        )
        btn_pprl.pack(side="left", padx=20)

    def go_to_er(self):
        self.choose_linkage_type.forget()
        self.er_dataloader.pack(fill="both", expand=True)

    def go_to_workflow(self):
        if self.dataset_1_loaded:
            self.er_dataloader.forget()
            self.er_workflow.pack(fill="both", expand=True)

    def load_er_csv(self, dataset_num):
        filepath = filedialog.askopenfilename(
            filetypes=(("CSV files", "*.csv"), ("All files", "*.*"))
        )

        if not filepath:
            return

        try:
            if dataset_num == 1:
                user_sep = self.entry_sep_1.get()
                user_id_col = self.entry_id_1.get()

                self.df_1 = pd.read_csv(filepath, sep=user_sep)
                if user_id_col not in self.df_1.columns:
                    self.lbl_status_1.configure(
                        text=f"[ ERROR ]: Column {user_id_col} not found in CSV file.",
                        text_color="#ff3333"
                    )
                    return

                self.lbl_status_1.configure(
                    text=f"[ SUCCESS ]: CSV file loaded successfully.\n{len(self.df_1)} records loaded.",
                    text_color="#00ffcc"
                )

                self.show_dataframe_popup(self.df_1, "Dataset 1")
                self.dataset_1_loaded = True
            elif dataset_num == 2:
                user_sep = self.entry_sep_2.get()
                user_id_col = self.entry_id_2.get()
                self.df_2 = pd.read_csv(filepath, sep=user_sep)
                if user_id_col not in self.df_2.columns:
                    self.lbl_status_2.configure(
                        text=f"[ ERROR ]: Column {user_id_col} not found in CSV file.",
                        text_color="#ff3333"
                    )
                    return

                self.lbl_status_2.configure(
                    text=f"[ SUCCESS ]: CSV file loaded successfully.\n{len(self.df_2)} records loaded.",
                    text_color="#00ffcc"
                )
                self.show_dataframe_popup(self.df_2, "Dataset 2")
                self.dataset_2_loaded = True

            elif dataset_num == 3:
                user_sep = self.entry_sep_gt.get()
                self.ground_truth = pd.read_csv(filepath, sep=user_sep)

                self.lbl_status_gt.configure(
                    text=f"[ SUCCESS ]: CSV file loaded successfully.\n{len(self.ground_truth)} records loaded.",
                    wraplength=200,
                    text_color="#00ffcc"
                )
                self.show_dataframe_popup(self.ground_truth, "Ground Truth")
                self.ground_truth_loaded = True

        except Exception as e:
            if dataset_num == 1:
                self.lbl_status_1.configure(
                    text=f"[ ERROR ]: Could not find CSV file.",
                )
            if dataset_num == 2:
                self.lbl_status_2.configure(
                    text=f"[ ERROR ]: Could not find CSV file.",
                )
            if dataset_num == 3:
                self.lbl_status_gt.configure(
                    text=f"[ ERROR ]: Could not find CSV file.",
                )

    def show_dataframe_popup(self, dataframe : pd.DataFrame, dataset_name : str):
        # 1. Create the new pop-up window
        popup = ctk.CTkToplevel(self.root)
        popup.title(f"DATA INSPECTOR // {dataset_name}")
        popup.geometry("850x600")

        # Bring the pop-up to the front
        popup.attributes("-topmost", True)

        # 2. Add a title label
        lbl_title = ctk.CTkLabel(
            popup,
            text=f"[ VIEWING {dataset_name} ]",
            font=("Courier", 18, "bold"),
            text_color="#00ffcc"
        )
        lbl_title.pack(pady=15)

        # 3. Add a Textbox to display the dataframe
        # wrap="none" is CRITICAL here so your columns don't break onto the next line!
        txt_data = ctk.CTkTextbox(
            popup,
            width=800,
            height=500,
            font=("Consolas", 12),
            fg_color="#0a0a0a",  # Dark background
            text_color="#39ff14",  # Hacker green text
            wrap="none"
        )
        txt_data.pack(padx=20, pady=10)

        formatted_df = dataframe.head(10).to_string(
            max_colwidth=40,
            justify="left"
        )

        # 4. Insert the pandas dataframe as a formatted string
        txt_data.insert("0.0", formatted_df)

        # 5. Lock the textbox so the user can't accidentally type in it
        txt_data.configure(state="disabled")



def load_csv():
    # Open file explorer to select a CSV
    filepath = filedialog.askopenfilename(
        title="Select a CSV File",
        filetypes=(("CSV files", "*.csv"), ("All files", "*.*"))
    )

    # If the user selected a file (didn't click cancel)
    if filepath:
        try:
            # Load the CSV into a pandas DataFrame
            global df  # Making it global so you can use it outside this function later
            df = pd.read_csv(filepath)

            # Clear any previous text in the preview area
            text_preview.delete(1.0, ctk.END)

            # Show a success pop-up
            messagebox.showinfo("Success", "CSV loaded successfully!")

            # Preview the first 5 rows in the GUI
            text_preview.insert(ctk.END, f"--- Data Preview (First 5 rows) ---\n\n{df.head().to_string()}")

            # NOTE: You can call your custom library's functions here, passing 'df' to them!

        except Exception as e:
            # If something goes wrong (e.g., bad file format), show an error pop-up
            messagebox.showerror("Error", f"Failed to read file:\n{e}")



if __name__ == "__main__":
    ctk.set_appearance_mode("dark")
    root = ctk.CTk()
    app = ChatMatcherApp(root)
    root.mainloop()


# # --- Main Window Setup ---
# root = ctk.CTk()
# root.title("ChatMatcher")
# root.geometry("700x450")  # Set the window size
# root.config(padx=20, pady=20)
#
# # Add a welcome label
# label_title = ctk.CTkLabel(root, text="Welcome! Let's load your data.", font=("Arial", 16, "bold"))
# label_title.pack(pady=(0, 15))
#
# # Add the Load CSV button
# btn_load = ctk.CTkButton(
#     root,
#     text="[ UPLOAD CSV DATA ]",
#     font=("Courier", 14, "bold"),
#     fg_color="transparent",
#     border_width=2,
#     text_color="#00ffcc",
#     border_color="#00ffcc",
#     hover_color="#004d40", # Dark teal when hovered
#     command=load_csv
# )
# btn_load.pack(pady=10)
#
# # Add a text box to display the data preview
# text_preview = ctk.CTkTextbox(
#     root,
#     height=300,
#     width=650,
#     font=("Consolas", 13),
#     fg_color="#0a0a0a", # Very dark grey/black background
#     text_color="#39ff14", # Classic terminal green
#     border_width=1,
#     border_color="#333333"
# )
#
#
# text_preview.pack(pady=15)
#
# # Run the application
# root.mainloop()