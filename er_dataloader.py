import customtkinter as ctk
import pandas as pd
from tkinter import filedialog, messagebox
from pyjedai.datamodel import Data
from er_workflow import ERWorkflow

class ERDataloader:
    main_frame : ctk.CTkFrame
    next_frame : ERWorkflow

    def __init__(self, master, color):
        self.master = master
        self.main_frame = ctk.CTkFrame(master, fg_color=color)


    def build(self):
        container = ctk.CTkFrame(self.main_frame, fg_color="transparent")
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

        self.entry_nrows_1 = ctk.CTkEntry(dataset_container_1, placeholder_text="Max Rows (blank for all)", width=220,
                                       border_color="#333333")
        self.entry_nrows_1.pack(pady=(0, 20))

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
        self.entry_nrows_2 = ctk.CTkEntry(dataset_container_2, placeholder_text="Max Rows (blank for all)", width=220,
                                        border_color="#333333")

        self.entry_nrows_2.pack(pady=(0, 20))
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

                raw_nrows = self.entry_nrows_1.get().strip()
                user_nrows = int(raw_nrows) if raw_nrows.isdigit() else None


                self.df_1 = pd.read_csv(filepath, sep=user_sep, nrows=user_nrows).astype(str)
                print(self.df_1)
                # If they forgot to type an ID, stop immediately
                if not user_id_col:
                    self.lbl_status_1.configure(text="[ ERROR ]: Please type an ID Column Name.", text_color="#ff3333")
                    return

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
                raw_nrows = self.entry_nrows_2.get().strip()
                user_nrows = int(raw_nrows) if raw_nrows.isdigit() else None
                self.df_2 = pd.read_csv(filepath, sep=user_sep, nrows=user_nrows).astype(str)
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
                self.ground_truth = pd.read_csv(filepath, sep=user_sep).astype(str)




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
                    text=f"[ ERROR ]: {str(e)} Could not find CSV file.",
                )
            if dataset_num == 2:
                self.lbl_status_2.configure(
                    text=f"[ ERROR ]: {str(e)} Could not find CSV file.",
                )
            if dataset_num == 3:
                self.lbl_status_gt.configure(
                    text=f"[ ERROR ]: {str(e)} Could not find CSV file.",
                )

    def show_dataframe_popup(self, dataframe : pd.DataFrame, dataset_name : str):
        # 1. Create the new pop-up window
        popup = ctk.CTkToplevel(self.master)
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


    def go_to_workflow(self):
        if self.dataset_1_loaded:
            self.main_frame.forget()

            if self.dataset_1_loaded and not self.dataset_2_loaded and self.ground_truth_loaded:
                ids = self.df_1[self.entry_id_1.get()].tolist()

                self.ground_truth.columns = ["D1", "D2"]
                self.ground_truth = self.ground_truth[self.ground_truth["D1"].isin(ids)]
                self.ground_truth = self.ground_truth[self.ground_truth["D2"].isin(ids)]

            elif self.dataset_1_loaded and self.dataset_2_loaded and self.ground_truth_loaded:
                ids_1 = self.df_1[self.entry_id_1.get()].tolist()
                ids_2 = self.df_2[self.entry_id_2.get()].tolist()

                self.ground_truth.columns = ["D1", "D2"]
                self.ground_truth = self.ground_truth[self.ground_truth["D1"].isin(ids_1)]
                self.ground_truth = self.ground_truth[self.ground_truth["D2"].isin(ids_2)]


            self.next_frame.data = Data(
                dataset_1=self.df_1,
                dataset_2=self.df_2 if hasattr(self, 'dataset_2_loaded') else None,
                ground_truth=self.ground_truth if hasattr(self, 'ground_truth_loaded') else None,
                id_column_name_1=self.entry_id_1.get(),
                id_column_name_2=self.entry_id_2.get() if hasattr(self, 'dataset_2_loaded') else None
            )
            self.next_frame.main_frame.pack(fill="both", expand=True)