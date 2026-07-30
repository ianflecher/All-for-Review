from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import pdfplumber
import os
import tempfile
import re
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

class PDFTextExtractor:
    def extract_with_pdfplumber(self, pdf_path):
        try:
            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text
        except Exception as e:
            print(f"pdfplumber error: {e}")
            return ""
    
    def extract_with_pypdf2(self, pdf_path):
        try:
            text = ""
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text
        except Exception as e:
            print(f"PyPDF2 error: {e}")
            return ""
    
    def extract_text(self, pdf_path):
        # Try pdfplumber first
        text = self.extract_with_pdfplumber(pdf_path)
        if text and len(text.strip()) > 50:
            return text
        
        # Try PyPDF2 as fallback
        text = self.extract_with_pypdf2(pdf_path)
        if text and len(text.strip()) > 50:
            return text
        
        return ""

extractor = PDFTextExtractor()

def organize_content(text):
    """Organize extracted text into structured content"""
    items = []
    
    if not text:
        return items
    
    # Split into paragraphs
    paragraphs = re.split(r'\n\s*\n', text)
    
    for i, para in enumerate(paragraphs):
        para = para.strip()
        if not para:
            continue
        
        # Check if it's a heading (all caps or short)
        if (para.isupper() and len(para) < 100) or (len(para) < 50 and para.endswith(':')):
            items.append({
                'id': f'heading-{i}',
                'type': 'heading',
                'content': para
            })
        # Check for bullet points
        elif '•' in para or para.startswith('-') or para.startswith('*'):
            items.append({
                'id': f'bullet-{i}',
                'type': 'bullet',
                'content': para
            })
        # Regular paragraph
        else:
            items.append({
                'id': f'paragraph-{i}',
                'type': 'paragraph',
                'content': para
            })
    
    return items

@app.route('/api/extract-pdf', methods=['POST'])
def extract_pdf():
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(tempfile.gettempdir(), filename)
        file.save(temp_path)
        
        # Extract text
        text = extractor.extract_text(temp_path)
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
        
        if text and len(text.strip()) > 0:
            # Organize content
            content_items = organize_content(text)
            
            return jsonify({
                'success': True,
                'text': text,
                'content_items': content_items,
                'char_count': len(text)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Could not extract text from PDF. Make sure it contains selectable text.'
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)