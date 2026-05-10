import re
import cv2
import numpy as np
import pytesseract
from PIL import Image
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

# --- LÓGICA DE EXTRACCIÓN MEJORADA V2 ---

def extraer_nombres_apellidos_v2(texto):
    texto_up = texto.upper()
    nombres = "NO ENCONTRADO"
    apellidos = "NO ENCONTRADO"

    # Lista de "basura" común que el OCR lee por error en los bordes
    BASURA_OCR = ['POA', 'PDA', 'IS', 'ED', 'LOLA', 'SERVICI', 'REGISTRO', 'CIVIL', 'IDENTIFIC']

    # 1. Extraer Apellidos
    match_ape = re.search(r'APELLIDOS\s+(.*?)\s+NOMBRES', texto_up, re.DOTALL)
    if match_ape:
        raw_ape = match_ape.group(1).replace('\n', ' ')
        limpio_ape = re.sub(r'[^A-ZÑÁÉÍÓÚ ]', '', raw_ape).strip()
        
        palabras = limpio_ape.split()
        # Filtramos palabras que estén en la lista negra o tengan menos de 3 letras
        # (A menos que sean apellidos cortos reales, pero en Chile son raros de 2 letras)
        palabras_filtradas = [
            w for w in palabras 
            if w not in BASURA_OCR and len(w) > 2
        ]
        apellidos = ' '.join(palabras_filtradas)

    # 2. Extraer Nombres
    match_nom = re.search(r'NOMBRES\s+(.*?)\s+NACIONALIDAD', texto_up, re.DOTALL)
    if match_nom:
        raw_nom = match_nom.group(1).replace('\n', ' ')
        limpio_nom = re.sub(r'[^A-ZÑÁÉÍÓÚ ]', '', raw_nom).strip()
        
        palabras_n = limpio_nom.split()
        palabras_filtradas_n = [
            w for w in palabras_n 
            if w not in BASURA_OCR and len(w) > 2
        ]
        nombres = ' '.join(palabras_filtradas_n)

    return nombres, apellidos

def extraer_fechas_por_antiguedad(texto):
    # Busca patrones de fecha comunes en el carnet chileno: 21 FEB 1982
    fechas = re.findall(r'(\d{1,2}\s+[A-Z]{3,4}\s+\d{4})', texto.upper())
    
    if not fechas:
        return "VACÍO", "VACÍO", "VACÍO"

    # Ordenamos las fechas por el año (últimos 4 caracteres)
    # Nacimiento = La más antigua, Vencimiento = La más futura
    fechas_ordenadas = sorted(fechas, key=lambda x: int(re.search(r'\d{4}', x).group()))
    
    nacimiento = fechas_ordenadas[0]
    emision = fechas_ordenadas[1] if len(fechas_ordenadas) > 1 else "VACÍO"
    vencimiento = fechas_ordenadas[-1] if len(fechas_ordenadas) > 1 else "VACÍO"
    
    return nacimiento, emision, vencimiento

def extraer_numero_documento_pro(texto):
    # Buscamos específicamente el bloque que suele empezar con 5 o 1 y tiene 9 dígitos
    # Eliminamos puntos para la búsqueda
    texto_limpio = texto.replace(".", "").replace(" ", "")
    
    # El número de documento suele ser de 9 dígitos y empezar con 5 o 1 en carnets actuales
    matches = re.findall(r'[15]\d{8}', texto_limpio)
    if matches:
        return matches[0]
    
    # Si no, cualquier cadena de 9 dígitos
    matches_any = re.findall(r'\d{9}', texto_limpio)
    return matches_any[0] if matches_any else "NO DETECTADO"

def extraer_rut_firme(texto):
    texto_up = texto.upper()
    
    # Intento 1: Buscar después de la etiqueta RUN (lo más seguro)
    match = re.search(r'RUN\s*([\d\.]+-[\dKk])', texto_up)
    if match:
        return match.group(1)
    
    # Intento 2: Buscar cualquier cadena que parezca RUT (12.345.678-9)
    # Esta regex es más flexible por si el OCR se come el guion
    match_fallback = re.search(r'(\d{1,2}(?:\.?\d{3}){2}-?[\dkK])', texto_up)
    if match_fallback:
        rut = match_fallback.group(1)
        # Si le falta el guion antes del último dígito, se lo ponemos
        if '-' not in rut:
            rut = rut[:-1] + '-' + rut[-1]
        return rut

    # Intento 3: En el carnet chileno, el RUT suele estar repetido cerca del número de documento
    # Buscamos patrones de 7 u 8 dígitos seguidos
    numeros_sueltos = re.findall(r'(\d{1,2}\.?\d{3}\.?\d{3})', texto_up)
    for num in numeros_sueltos:
        # Si el número tiene longitud de RUT, lo devolvemos (limpio) como candidato
        limpio = num.replace(".", "")
        if 7 <= len(limpio) <= 8:
            # Aquí podrías agregar una lógica de dígito verificador, 
            # pero por ahora lo retornamos para que el usuario lo vea.
            return num 

    return "NO ENCONTRADO"

# --- PROCESAMIENTO DE IMAGEN ---

def limpiar_imagen(path_original):
    img = cv2.imread(path_original)
    if img is None: return path_original
    
    # Re-escalado para mejorar lectura de letras pequeñas
    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Nitidez
    kernel = np.array([[0, -1, 0], [-1, 5,-1], [0, -1, 0]])
    sharp = cv2.filter2D(gray, -1, kernel)
    
    # Binarización de Otsu (Blanco y negro puro)
    _, thresh = cv2.threshold(sharp, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    path_proc = path_original.replace(".", "_proc.")
    cv2.imwrite(path_proc, thresh)
    return path_proc

# --- ENDPOINT PRINCIPAL ---

@app.route('/process', methods=['POST'])
def process_ocr():
    try:
        data = request.get_json()
        file_path = data.get('filePath')
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({"success": False, "error": "Archivo no encontrado"}), 404

        # 1. Limpiar imagen
        path_listo = limpiar_imagen(file_path)
        
        # 2. OCR (PSM 3 es más flexible para carnets)
        config = r'--oem 3 --psm 3'
        raw_text = pytesseract.image_to_string(Image.open(path_listo), config=config, lang='spa')
        
        # 3. Extraer Datos con las nuevas funciones
        rut = extraer_rut_firme(raw_text)
        nombres, apellidos = extraer_nombres_apellidos_v2(raw_text)
        f_nac, f_emi, f_ven = extraer_fechas_por_antiguedad(raw_text)
        num_doc = extraer_numero_documento_pro(raw_text)

        # 4. Responder
        return jsonify({
            "success": True,
            "rut": rut,
            "numero_documento": num_doc,
            "nombres": nombres,
            "apellidos": apellidos,
            "fechaNacimiento": f_nac,
            "fechaEmision": f_emi,
            "fechaVencimiento": f_ven,
            "raw_text": raw_text
        })

    except Exception as e:
        print(f"Error en Python: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)