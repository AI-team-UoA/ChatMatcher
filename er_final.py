import customtkinter as ctk
import pandas as pd
from tkinter import filedialog


class ERFinal:
    main_frame : ctk.CTkFrame
    final_df : pd.DataFrame
    llms_df : pd.DataFrame
    
    
    def __init__(self, root : ctk.CTk, color):
        self.root = root
        self.main_frame = ctk.CTkFrame(root, fg_color=color)
        
    def build(self):
        lbl_title = ctk.CTkLabel(
            self.main_frame, 
            text="[ SYSTEM: EXPORT RESULTS ]", 
            font=("Courier", 24, "bold"), text_color="#00ffcc"
        )
        lbl_title.pack(pady=(40, 20))
        
        lbl_info = ctk.CTkLabel(
            self.main_frame,
            text=f"LLM Pairs: {len(self.llms_df)} rows  |  Final Pairs: {len(self.final_df)} rows",
            font=("Courier", 14), text_color="#39ff14"
        )
        lbl_info.pack(pady=(0, 40))

        # --- 2. BUTTON CONTAINER ---
        btn_container = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        btn_container.pack(pady=10)

        # Button: Save LLM Pairs
        btn_save_llm = ctk.CTkButton(
            btn_container,
            text="💾 SAVE LLM PAIRS (.csv)",
            font=("Courier", 14, "bold"),
            fg_color="#333333", border_width=2, text_color="#00ffcc", border_color="#00ffcc", hover_color="#004d40",
            command=self.save_llm_pairs
        )
        btn_save_llm.pack(side="left", padx=20)

        # Button: Save Final Pairs
        btn_save_final = ctk.CTkButton(
            btn_container,
            text="💾 SAVE FINAL PAIRS (.csv)",
            font=("Courier", 14, "bold"),
            fg_color="#333333", border_width=2, text_color="#00ffcc", border_color="#00ffcc", hover_color="#004d40",
            command=self.save_final_pairs
        )
        btn_save_final.pack(side="left", padx=20)

        # --- 3. STATUS FEEDBACK ---
        # This will update to show success/error messages so they know it worked
        self.lbl_status = ctk.CTkLabel(self.main_frame, text="", font=("Courier", 12))
        self.lbl_status.pack(pady=30)
        
        # --- 4. EXIT BUTTON ---
        btn_exit = ctk.CTkButton(
            self.main_frame,
            text="[ SHUTDOWN SYSTEM ]",
            font=("Courier", 14, "bold"),
            fg_color="transparent", text_color="#ff3333", hover_color="#4a0000",
            command=self.root.quit # Closes the application completely
        )
        btn_exit.pack(side="bottom", pady=40)

    # ==========================================
    #             SAVE LOGIC
    # ==========================================
    
    def save_llm_pairs(self):
        self._save_dataframe(self.llms_df, "LLM Pairs", "llm_pairs_export.csv")

    def save_final_pairs(self):
        self._save_dataframe(self.final_df, "Final Pairs", "final_pairs_export.csv")

    def _save_dataframe(self, df: pd.DataFrame, display_name: str, default_filename: str):
        """Helper function that handles the actual file saving process."""
        
        # Safety check: make sure the dataframe actually exists
        if df is None or df.empty:
            self.lbl_status.configure(text=f"[ ERROR ]: No data found for {display_name}!", text_color="#ff3333")
            return

        # 1. Open the "Save As" dialogue
        filepath = filedialog.asksaveasfilename(
            defaultextension=".csv", # Forces .csv if they forget to type it
            initialfile=default_filename, # Recommends a file name
            title=f"Save {display_name} As",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )

        # 2. If the user picked a location (didn't click cancel)
        if filepath:
            try:
                # index=False prevents pandas from writing the row numbers (0, 1, 2...) into the file
                df.to_csv(filepath, index=False) 
                
                self.lbl_status.configure(
                    text=f"[ SUCCESS ]: {display_name} securely saved to:\n{filepath}", 
                    text_color="#00ffcc"
                )
            except PermissionError:
                # This usually happens if the user has the CSV open in Excel while trying to overwrite it!
                self.lbl_status.configure(text=f"[ ERROR ]: Permission denied. Is the file open in Excel?", text_color="#ff3333")
            except Exception as e:
                self.lbl_status.configure(text=f"[ ERROR ]: Failed to write file.\n{e}", text_color="#ff3333")
        