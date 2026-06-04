import customtkinter as ctk
import pandas as pd
from tkinter import filedialog, messagebox

class ERChooseLinkage:
    main_frame : ctk.CTkFrame
    er_dataloader : ctk.CTkFrame
    
    def __init__(self, master, color):
        self.master = master
        self.main_frame = ctk.CTkFrame(master, fg_color=color)

    
    def build(self):
        container = ctk.CTkFrame(self.main_frame, fg_color="transparent")
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
        self.main_frame.forget()
        self.er_dataloader.pack(fill="both", expand=True)
