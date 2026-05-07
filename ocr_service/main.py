def extraer_nombres(texto):
    # Busca la línea que sigue a la palabra NOMBRES
    match = re.search(r'NOMBRES?\s*:?\s*([A-ZÁÉÍÓÚÑ ]+)', texto.upper())
    if match:
        return match.group(1).strip()
    # Alternativa: busca dos palabras en mayúsculas seguidas de NACIONALIDAD
    match = re.search(r'NOMBRES?\s*:?\s*([A-ZÁÉÍÓÚÑ ]+)\s+NACIONALIDAD', texto.upper())
    if match:
        return match.group(1).strip()
    # Heurística mejorada: agrupa líneas mayúsculas consecutivas entre NOMBRES y NACIONALIDAD
    lines = texto.upper().split('\n')
    nombres = []
    found_nombres = False
    for line in lines:
        if 'NOMBRES' in line:
            found_nombres = True
            continue
        if 'NACIONALIDAD' in line:
            break
        if found_nombres:
            # Si la línea es mayúscula y no contiene palabras clave, la agregamos
            if line.strip().isupper() and not any(x in line for x in ['APELLIDOS', 'NACIONALIDAD', 'SEXO', 'CHILENA', 'FEMENINO', 'MASCULINO']):
                nombres.append(line.strip())
            # Si la línea está vacía o no es mayúscula, pero ya tenemos nombres, paramos
            elif nombres:
                break
    if nombres:
        return ' '.join(nombres)
    return None

def extraer_apellidos(texto):
    # Busca la línea que sigue a la palabra APELLIDOS
    match = re.search(r'APELLIDOS?\s*:?\s*([A-ZÁÉÍÓÚÑ ]+)', texto.upper())
    if match:
        return match.group(1).strip()
    # Alternativa: busca dos palabras en mayúsculas seguidas de SEXO
    match = re.search(r'APELLIDOS?\s*:?\s*([A-ZÁÉÍÓÚÑ ]+)\s+SEXO', texto.upper())
    if match:
        return match.group(1).strip()
    # Heurística mejorada: agrupa líneas mayúsculas consecutivas entre APELLIDOS y NOMBRES
    lines = texto.upper().split('\n')
    apellidos = []
    found_apellidos = False
    for line in lines:
        if 'APELLIDOS' in line:
            found_apellidos = True
            continue
        if 'NOMBRES' in line:
            break
        if found_apellidos:
            if line.strip().isupper() and not any(x in line for x in ['NOMBRES', 'NACIONALIDAD', 'SEXO', 'CHILENA', 'FEMENINO', 'MASCULINO']):
                apellidos.append(line.strip())
            elif apellidos:
                break
    if apellidos:
        return ' '.join(apellidos)
    return None

def extraer_fecha_nacimiento(texto):
    # Busca la fecha después de FECHA DE NACIMIENTO
    match = re.search(r'FECHA DE NACIMIENTO\s*:?\s*(\d{1,2} [A-Z]{3} \d{4})', texto.upper())
    if match:
        return match.group(1).strip()
    return None

def extraer_fecha_emision(texto):
    match = re.search(r'FECHA DE EMISION\s*:?\s*(\d{1,2} [A-Z]{3} \d{4})', texto.upper())
    if match:
        return match.group(1).strip()
    return None

def extraer_fecha_vencimiento(texto):
    match = re.search(r'FECHA DE VENCIMIENTO\s*:?\s*(\d{1,2} [A-Z]{3} \d{4})', texto.upper())
    if match:
        return match.group(1).strip()
    return None
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

    # Filtro de nitidez (sharpen)
    kernel_sharpen = np.array([[0, -1, 0],
                               [-1, 5,-1],
                               [0, -1, 0]])
    sharp = cv2.filter2D(gray, -1, kernel_sharpen)

    # Filtro de reducción de ruido
    denoised = cv2.fastNlMeansDenoising(sharp, None, h=30, templateWindowSize=7, searchWindowSize=21)

    # Morfología para cerrar huecos en letras
    kernel = np.ones((2,2), np.uint8)
    morph = cv2.morphologyEx(denoised, cv2.MORPH_CLOSE, kernel)

    # Umbralización fuerte (Blanco y negro puro)
    _, thresh = cv2.threshold(morph, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

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
        nombres = extraer_nombres(raw_text)
        apellidos = extraer_apellidos(raw_text)
        fecha_nacimiento = extraer_fecha_nacimiento(raw_text)
        fecha_emision = extraer_fecha_emision(raw_text)
        fecha_vencimiento = extraer_fecha_vencimiento(raw_text)
        # Log en la consola de Python para ver qué pasa
        print(f"--- DEBUG OCR ---")
        print(f"Texto extraído: {raw_text[:100]}..." ) 
        print(f"RUT filtrado: {rut}")
        print(f"Número de documento: {numero_documento}")
        print(f"Nombres: {nombres}")
        print(f"Apellidos: {apellidos}")
        print(f"Fecha nacimiento: {fecha_nacimiento}")
        print(f"Fecha emisión: {fecha_emision}")
        print(f"Fecha vencimiento: {fecha_vencimiento}")
        return jsonify({
            "success": True,
            "rut": rut,
            "numero_documento": numero_documento,
            "nombres": nombres,
            "apellidos": apellidos,
            "fechaNacimiento": fecha_nacimiento,
            "fechaEmision": fecha_emision,
            "fechaVencimiento": fecha_vencimiento,
            "raw_text": raw_text
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)