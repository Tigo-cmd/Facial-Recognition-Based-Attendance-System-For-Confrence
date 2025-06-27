import os
import json
from datetime import datetime
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def log_to_google_sheet():
    """Test function to log sample data to Google Sheet"""
    try:
        # Google Sheets setup
        SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
        SERVICE_ACCOUNT_FILE = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        SPREADSHEET_ID = os.getenv('SPREADSHEET_ID')
        SHEET_NAME = os.getenv('SHEET_NAME', 'Attendance')  # Default value

        print("Initializing Google Sheets connection...")
        print(f"Service Account: {SERVICE_ACCOUNT_FILE}")
        print(f"Spreadsheet ID: {SPREADSHEET_ID}")
        print(f"Sheet Name: {SHEET_NAME}")

        # Initialize gspread client
        creds = ServiceAccountCredentials.from_json_keyfile_name(SERVICE_ACCOUNT_FILE, SCOPES)
        gc = gspread.authorize(creds)
        sheet = gc.open_by_key(SPREADSHEET_ID).worksheet(SHEET_NAME)

        # Get current timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Create test data
        test_data = {
            "timestamp": timestamp,
            "attendeeId": "test-001",
            "attendeeName": "Test User"
        }
        
        # Prepare row data
        row = [
            test_data['timestamp'],
            test_data['attendeeId'],
            test_data['attendeeName']
        ]
        
        print(f"\nPreparing to write row: {row}")
        
        # Append to sheet
        sheet.append_row(row, value_input_option='USER_ENTERED')
        
        print("✅ Successfully wrote to Google Sheet!")
        print("Check your sheet for new data:")
        print(f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid={sheet.id}")
        
        return True
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == '__main__':
    # Run the test
    print("Starting Google Sheet logging test...\n")
    success = log_to_google_sheet()
    
    if success:
        print("\nTest completed successfully!")
    else:
        print("\nTest failed. Check error message above.")