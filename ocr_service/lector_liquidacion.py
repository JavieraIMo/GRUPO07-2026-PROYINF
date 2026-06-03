# ocr_service/lector_liquidacion.py
import re
import pdfplumber

def extraer_texto_pdf(file_path):
    """Extrae el texto plano del PDF para enviarlo al log de Node."""
    try:
        texto = ""
        with pdfplumber.open(file_path) as pdf:
            for pagina in pdf.pages:
                texto += pagina.extract_text(layout=True) + "\n"
        return texto
    except Exception as e:
        return f"Error al extraer texto crudo: {str(e)}"

def procesar_liquidacion_chile(file_path):
    texto_completo = extraer_texto_pdf(file_path)
    texto_up = texto_completo.upper()

    # Inicializar campos por defecto del TRABAJADOR
    rut = "NO ENCONTRADO"
    nombre_liquidacion = "NO ENCONTRADO"
    sueldo_base = "0"
    asignacion_family = "0"
    nombre_afp = "NO DETECTADO"
    nombre_salud = "NO DETECTADO"
    saldo_liquido = "0"
    
    # IMPORTANTE: Como estos datos en la liquidación pertenecen a la EMPRESA,
    # los dejamos vacíos para que no pisen los datos personales reales del cliente.
    direccion = ""
    telefono = ""
    email = ""

    # --- 1. AISLAMIENTO ESTRICTO DE DATOS DEL TRABAJADOR ---
    # Buscamos desde "DATOS DEL TRABAJADOR" en adelante para evitar el RUT y datos de la empresa.
    bloque_trabajador = re.search(r'DATOS DEL TRABAJADOR(.*)', texto_up, re.DOTALL)
    texto_seguro = bloque_trabajador.group(1) if bloque_trabajador else texto_up

    # RUT Trabajador (Primer RUT que aparezca DESPUÉS de la línea "DATOS DEL TRABAJADOR")
    match_rut = re.search(r'(\d{1,2}(?:\.?\d{3}){2}-?[\dkK])', texto_seguro)
    if match_rut:
        rut = match_rut.group(1).strip()

    # Nombre Trabajador
    match_nombre = re.search(r'NOMBRE:\s*([A-ZÑÁÉÍÓÚa-zñáéíóú\s]+)', texto_seguro)
    if match_nombre:
        raw_nombre = match_nombre.group(1).split('\n')[0]
        nombre_liquidacion = re.sub(r'\s+', ' ', raw_nombre).strip()

    # --- 2. VALORES FINANCIEROS (Se buscan en el texto completo usando patrones exactos) ---
    
    # Sueldo Base
    match_base = re.search(r'SUELDO\s+BASE[\s\$\.]*([\d\.,]+)', texto_up)
    if match_base:
        sueldo_base = match_base.group(1).replace('.', '').replace(',', '.')

    # Número de cargas familiares
    match_cargas = re.search(r'#\s*CARGAS:\s*(\d+)', texto_up)
    if match_cargas:
        asignacion_family = match_cargas.group(1).strip()

    # AFP
    if "PROVIDA" in texto_up: nombre_afp = "PROVIDA"
    elif "HABITAT" in texto_up: nombre_afp = "HABITAT"
    elif "CUPRUM" in texto_up: nombre_afp = "CUPRUM"
    elif "MODELO" in texto_up: nombre_afp = "MODELO"
    elif "PLANVITAL" in texto_up: nombre_afp = "PLANVITAL"
    elif "UNO" in texto_up: nombre_afp = "UNO"

    # Salud
    if "FONASA" in texto_up:
        nombre_salud = "FONASA"
    elif "ISAPRE" in texto_up:
        match_isapre = re.search(r'ISAPRE\s+([A-ZÁÉÍÓÚ]+)', texto_up)
        nombre_salud = f"ISAPRE {match_isapre.group(1).strip()}" if match_isapre else "ISAPRE"

    # --- 3. EXTRACCIÓN DEL SALDO LÍQUIDO REAL ---
    # Prioridad 1: Saldo líquido definitivo a pagar (El monto final que recibe el trabajador)
    match_liq_pagar = re.search(r'SALDO\s+LIQUIDO\s+A\s+PAGAR[\s\$\.]*([\d\.,]+)', texto_up)
    
    if match_liq_pagar:
        saldo_liquido = match_liq_pagar.group(1).replace('.', '').replace(',', '.')
    else:
        # Prioridad 2: Alcance Líquido (Antes de anticipos o préstamos)
        match_alcance = re.search(r'ALCANCE\s+LIQUIDO[\s\$\(1\)\-(2)]*([\d\.,]+)', texto_up)
        if match_alcance:
            saldo_liquido = match_alcance.group(1).replace('.', '').replace(',', '.')
        else:
            # Fallback: Total de Haberes
            match_haberes = re.search(r'TOTAL\s+DE\s+HABERES\s*\(1\)[\s\$\.]*([\d\.,]+)', texto_up)
            if match_haberes:
                saldo_liquido = match_haberes.group(1).replace('.', '').replace(',', '.')

    return {
        "success": True,
        "rut": rut,
        "nombre_completo_doc": nombre_liquidacion,
        "sueldo_base": sueldo_base,
        "asignacion_family": asignacion_family,
        "nombre_afp": nombre_afp,
        "nombre_salud": nombre_salud,
        "saldo_liquido": saldo_liquido,
        "direccion": direccion, # Enviará "" para no sobreescribir los datos reales en React
        "telefono": telefono,   # Enviará ""
        "email": email          # Enviará ""
    }