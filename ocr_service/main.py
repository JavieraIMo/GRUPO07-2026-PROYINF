from flask import Flask, request, jsonify
import cv2
import numpy as np
import pytesseract
from PIL import Image
import re
import os

app = Flask(__name__)

def limpiar_imagen(path_original):
    img = cv2.imread(path_original)
    # Aumentar el tamaño de la imagen ayuda a Tesseract a ver letras pequeñas
    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Filtro de ruido para eliminar las tramas del carnet
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Umbralización fuerte (Blanco y negro puro)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    path_proc = path_original.replace(".", "_proc.")
    cv2.imwrite(path_proc, thresh)
    return path_proc

def extraer_numero_documento(texto):
    # 1. Intentamos buscar la etiqueta "NÚMERO DOCUMENTO" y capturar lo que sigue
    # Limpiamos el texto para manejar errores comunes de lectura
    limpio = texto.upper().replace("»", "").replace(">", "").replace("=", "").replace(" ", "")
    
    # El número de documento suele tener 9 dígitos
    # Buscamos una secuencia de 9 números que esté cerca de la palabra DOCUMENTO
    # O simplemente cualquier secuencia de 9 dígitos que no sea el RUT
    patrones = [
        r'DOCUMENTO(\d{9})', # Pegado a la palabra
        r'(\d{9})'           # Cualquier grupo de 9 números sueltos
    ]
    
    for patron in patrones:
        match = re.search(patron, limpio)
        if match:
            # Si encontramos 9 dígitos, lo devolvemos
            return match.group(1)
            
    return None



def extraer_rut(texto):
    # 1. Limpieza agresiva: quitamos todo lo que no sea números, K o guiones
    # A veces el OCR lee el RUT con puntos pero el Regex falla por símbolos locos
    # Reemplazamos la 'S' por '5' y la 'G' por '6' que son errores típicos
    limpio = texto.upper().replace("S", "5").replace("G", "6").replace("I", "1").replace("B", "8")
    
    # 2. Buscamos el patrón del RUT
    # He ajustado el regex para que sea más "cazador"
    patron = r'(\d{1,2}(?:\.?\d{3}){2}-[\dkK])'
    
    match = re.search(patron, limpio)
    if match:
        return match.group(1)
    
    # 3. Si falla, buscamos solo los números seguidos y tratamos de armarlo
    # Esto ayuda si el OCR no leyó los puntos
    solo_numeros = re.findall(r'\d+', limpio)
    cadena = "".join(solo_numeros)
    if len(cadena) >= 8:
        # Intenta tomar los últimos dígitos como un posible cuerpo de RUT
        posible_rut = cadena[-9:-1] + "-" + cadena[-1]
        return posible_rut

    return None

@app.route('/process', methods=['POST'])
def process_ocr():
    try:
        data = request.get_json()
        file_path = data.get('filePath')
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({"success": False, "error": "Archivo no encontrado en el volumen compartido"}), 404

        path_listo = limpiar_imagen(file_path)
        # --psm 6 es ideal para documentos con datos dispersos como el carnet
        config = r'--oem 3 --psm 6'
        raw_text = pytesseract.image_to_string(Image.open(path_listo), config=config, lang='spa')
        
        rut = extraer_rut(raw_text)
        numero_documento = extraer_numero_documento(raw_text)
        # Log en la consola de Python para ver qué pasa
        print(f"--- DEBUG OCR ---")
        print(f"Texto extraído: {raw_text[:100]}...") 
        print(f"RUT filtrado: {rut}")
        print(f"Número de documento: {numero_documento}")
        return jsonify({
            "success": True,
            "rut": rut,
            "numero_documento": numero_documento,
            "raw_text": raw_text
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)