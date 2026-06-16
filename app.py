import os
import re
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Cache configuration (simple in-memory cache)
feed_cache = {
    "data": None,
    "last_fetched": None
}

def fetch_and_parse_releases():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    
    xml_data = response.content
    root = ET.fromstring(xml_data)
    
    # Namespace for Atom feed
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    
    for entry in root.findall('atom:entry', ns):
        title_elem = entry.find('atom:title', ns)
        updated_elem = entry.find('atom:updated', ns)
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        if link_elem is None:
            link_elem = entry.find('atom:link', ns)
        content_elem = entry.find('atom:content', ns)
        
        title = title_elem.text if title_elem is not None else ""
        updated_str = updated_elem.text if updated_elem is not None else ""
        link_href = link_elem.get('href') if link_elem is not None else ""
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse individual updates within content_html
        # E.g. <h3>Feature</h3>\n<p>...</p>\n<h3>Issue</h3>...
        # We split by <h3> tag
        pattern = r'<h3>(.*?)</h3>(.*?(?=(?:<h3>|$)))'
        matches = re.findall(pattern, content_html, re.DOTALL)
        
        updates = []
        update_id_counter = 0
        for type_tag, body in matches:
            type_tag = type_tag.strip()
            body = body.strip()
            
            # Extract plain text for sharing / tweeting (remove HTML tags)
            plain_body = re.sub(r'<[^>]+>', '', body).strip()
            plain_body = re.sub(r'\s+', ' ', plain_body)
            
            # Generate a unique update-specific ID
            entry_safe_id = re.sub(r'\W+', '_', title.lower())
            update_id = f"{entry_safe_id}_{update_id_counter}"
            update_id_counter += 1
            
            updates.append({
                'id': update_id,
                'type': type_tag,
                'body_html': body,
                'body_text': plain_body
            })
            
        # Fallback if no <h3> tags found
        if not updates and content_html.strip():
            plain_body = re.sub(r'<[^>]+>', '', content_html).strip()
            plain_body = re.sub(r'\s+', ' ', plain_body)
            
            entry_safe_id = re.sub(r'\W+', '_', title.lower())
            updates.append({
                'id': f"{entry_safe_id}_0",
                'type': 'Update',
                'body_html': content_html,
                'body_text': plain_body
            })
            
        entries.append({
            'title': title,
            'updated': updated_str,
            'link': link_href,
            'updates': updates
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        releases = fetch_and_parse_releases()
        return jsonify({
            'success': True,
            'releases': releases
        })
    except Exception as e:
        print("Error fetching releases:", str(e))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
