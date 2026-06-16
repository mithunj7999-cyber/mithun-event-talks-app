# BigQuery Release Notes Dashboard

An elegant, real-time web application built with Python Flask and vanilla CSS/JavaScript that fetches Google Cloud's BigQuery release notes feed, parses them, organizes them dynamically, and lets you easily tweet specific updates with smart truncation.

## Features
- 🔄 **Real-Time XML Fetching**: Pulls live feed data from Google Cloud Platform's release notes.
- 📊 **Dynamic Statistics**: Automatically counts total releases, features, issues, and changes in the current feed.
- 🔍 **Interactive Filters & Search**: Filter updates by category tags (Features, Issues, Changes/Announcements) or perform a keyword-based text search.
- 🐦 **Character-Safe Tweet Composer**: Select any release card to automatically draft a tweet. Automatically calculates lengths and truncates descriptions to keep the draft within Twitter's 280-character limit (including links and hashtags).
- 🎨 **Premium Aesthetics**: Features a modern obsidian-dark glassmorphic UI with animated glowing spheres and responsive grid alignment.

---

## Project Structure
```text
bq-releases-notes/
├── app.py                 # Flask Server & Feed Parsing Logic
├── templates/
│   └── index.html         # HTML Layout & Structure
├── static/
│   ├── css/
│   │   └── style.css      # Styling Sheet (Glassmorphism & Glow Animations)
│   └── js/
│       └── app.js         # Frontend Controller (API Fetching, Filtering, & Composer)
└── .gitignore             # File exclusion list
```

---

## Installation & Setup

### 1. Prerequisites
Ensure you have Python 3.10+ installed on your machine.

### 2. Install Dependencies
Open your terminal and install the required modules:
```bash
pip install flask requests
```

### 3. Run the Application
Start the Flask development server:
```bash
python app.py
```

### 4. Open in Browser
Open your browser and navigate to:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## How It Works (Data Flow)
1. **Fetch & Parse**: The backend server requests the Google Cloud RSS feed, parses the XML namespace, and splits daily composite updates into discrete cards based on HTML tag scanning.
2. **Expose Endpoint**: The backend serves the timeline data via the `/api/releases` JSON endpoint.
3. **Render UI**: The browser fetches the JSON, computes counts, and populates the timeline.
4. **Draft Share**: Clicking an update focuses the tweet composer, which measures length boundaries and provides a direct "Tweet on X" web intent link.
