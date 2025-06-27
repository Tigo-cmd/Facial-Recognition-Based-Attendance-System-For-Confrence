from flask import Flask, request, jsonify, abort
from flask_cors import CORS
import threading
import queue
import os
from dotenv import load_dotenv
import json
from datetime import datetime
import gspread
from oauth2client.service_account import ServiceAccountCredentials
load_dotenv()

app = Flask(__name__)
CORS(app)

# Google Sheets setup
SERVICE_ACCOUNT_FILE = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
SPREADSHEET_ID = os.getenv('SPREADSHEET_ID')
SHEET_NAME = os.getenv('SHEET_NAME', 'Attendance')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
# SERVICE_ACCOUNT_FILE = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'service-account.json')
# SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID', '<YOUR_SPREADSHEET_ID>')
# SHEET_NAME = os.environ.get('SHEET_NAME', 'Attendance')

# Initialize gspread client
creds = ServiceAccountCredentials.from_json_keyfile_name(SERVICE_ACCOUNT_FILE, SCOPES)
gc = gspread.authorize(creds)
sheet = gc.open_by_key(SPREADSHEET_ID).worksheet(SHEET_NAME)

# In-memory queue for ESP32
pending = queue.Queue()

@app.route('/api/attendance', methods=['POST'])
def post_attendance():
    data = request.get_json()
    for field in ('id','attendeeId','attendeeName','timestamp'):
        if field not in data:
            abort(400, description=f'Missing {field}')
    # Append row to Google Sheet
    row = [data['timestamp'], data['attendeeId'], data['attendeeName']]
    sheet.append_row(row, value_input_option='USER_ENTERED')
    # Enqueue for ESP32
    pending.put(data)
    return jsonify({'success': True}), 201

@app.route('/api/attendance/next', methods=['GET'])
def get_next():
    try:
        item = pending.get_nowait()
    except queue.Empty:
        return '', 204
    return jsonify(item)

@app.route('/api/attendance/ack', methods=['POST'])
def ack():
    data = request.get_json()
    if 'id' not in data:
        abort(400, description='Missing id')
    # Acknowledged; nothing to do because get removed when fetched
    return jsonify({'success': True})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=port)

