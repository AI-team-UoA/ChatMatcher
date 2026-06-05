from distutils import command
from os import fpathconf
from tabnanny import filename_only
from er_dataloader import ERDataloader
from er_choose_linkage import ERChooseLinkage

import customtkinter as ctk
import pandas as pd

from er_workflow import ERWorkflow
from er_execution import ERExecution
from er_final import ERFinal

ctk.set_appearance_mode("dark")  # Forces dark mode
ctk.set_default_color_theme("blue")  # Base theme

class ChatMatcherApp:
    root : ctk.CTk

    def __init__(self, root : ctk.CTk):
        self.root = root
        self.root.title("ChatMatcher")
        self.root.geometry("800x450")
        self.root.bind_all("<Button-1>", self.lose_focus_on_click)

    
        self.choose_linkage_type = ERChooseLinkage(self.root, "transparent")
        self.choose_linkage_type.build()

        # Load Entity Resolution
        
        self.er_dataloader = ERDataloader(self.root, "transparent")
        self.choose_linkage_type.er_dataloader = self.er_dataloader.main_frame
        self.er_dataloader.build()
        
        self.er_workflow = ERWorkflow(self.root, "transparent")
        self.er_dataloader.next_frame = self.er_workflow

        self.er_workflow.build()
        # self.er_workflow.main_frame.pack(fill="both", expand=True)
        
        self.er_execution = ERExecution(self.root, "transparent")
        self.er_workflow.next_frame = self.er_execution
        self.er_execution.build()
        
        
        
        # self.choose_linkage_type.main_frame.pack(fill="both", expand=True)
        self.er_workflow.main_frame.pack(fill="both", expand=True)
        
    def lose_focus_on_click(self, event):
        """
        Forces the blinking cursor out of text inputs and combo boxes 
        by explicitly shifting focus to the clicked background element.
        """
        try:
            # 1. Grab the exact widget your mouse just clicked
            clicked_widget = event.widget
            widget_class = clicked_widget.winfo_class()

            # 2. Check what internal Tkinter class it is.
            # CustomTkinter uses "Entry" for inputs/comboboxes and "Text" for textboxes.
            if widget_class not in ("Entry", "Text"):
                # 3. THE FIX: Force the background element itself to take the focus!
                clicked_widget.focus_set()
                
        except Exception:
            # Pass silently if the widget was destroyed or invalid
            pass
    
        # self.choose_linkage_type.er_dataloader = self.er_dataloader.main_frame
        # self.choose_linkage_type.main_frame.pack(fill="both", expand=True)
        







    

    



if __name__ == "__main__":
    ctk.set_appearance_mode("dark")
    root = ctk.CTk()
    app = ChatMatcherApp(root)
    root.mainloop()

