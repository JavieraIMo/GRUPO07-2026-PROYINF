# import os
# import glob

# Limpiar archivos wait-for-it.sh.* antes de correr los tests
# for f in glob.glob(os.path.join(os.path.dirname(__file__), 'wait-for-it.sh.*')):
#     try:
#         os.remove(f)
#         print(f"Eliminado: {f}")
#     except Exception as e:
#         print(f"No se pudo eliminar {f}: {e}")

# import unittest

# @classmethod
#     def setUpClass(cls):
#         """Aquí seteamos los datos que TODOS los tests van a usar"""
#         cls.BASE_URL = "http://backend:3100/api"
#         # Seteamos un usuario de prueba global
#         cls.user_data = {
#             "email": "test_entrega@alara.cl",
#             "password": "password123",
#             "nombre": "Estudiante Prueba"
#         }
#         print("--- INICIANDO SUITE DE PRUEBAS ---")


# class TestRegistro(unittest.TestCase):
#     @classmethod
#     def setUpClass(cls): 
#         # Configuración para registro
#         pass
#     def test_01(self): ...
#     def test_02(self): ...

# class TestLogin(unittest.TestCase):
#     @classmethod
#     def setUpClass(cls): 
#         # Configuración para login
#         pass
#     def test_03(self): ...
#     def test_04(self): ...

# @classmethod
#     def tearDownClass(cls):
#         """Aquí informamos que terminamos o limpiamos"""
#         print("--- PRUEBAS FINALIZADAS: Limpiando entorno ---")


import unittest
import requests
import os
import glob

# Limpiar archivos wait-for-it.sh.* antes de correr los tests
for f in glob.glob(os.path.join(os.path.dirname(__file__), 'wait-for-it.sh.*')):
    try:
        os.remove(f)
        print(f"Eliminado: {f}")
    except Exception as e:
        print(f"No se pudo eliminar {f}: {e}")

class TestAlaraAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """
        PASO 1: Setear los datos de prueba.
        Este método prepara todo lo necesario ANTES de ejecutar los tests.
        """
        cls.BASE_URL = os.getenv('API_URL', 'http://backend:3100/api')
        
        # Seteamos los 'payloads' (datos de entrada) globalmente
        cls.registro_valido = {
            "email": "estudiante_prueba@alara.cl",
            "password": "password123",
            "nombre": "Usuario de Entrega"
        }
        
        cls.simulacion_valida = {
            "amount": 1000000,
            "term": 12,
            "interestRate": 1.5
        }

        print(f"\n[setUpClass] Entorno configurado. Conectando a: {cls.BASE_URL}")

    # -----------------------------------------------------
    # CASOS DE PRUEBA
    # -----------------------------------------------------

    def test_01_registro_exitoso(self):
        """CP-01: Probar registro usando datos seteados en setUpClass"""
        ruta = f"{self.BASE_URL}/auth/register"
        # Usamos el dato de clase cls.registro_valido
        response = requests.post(ruta, json=self.registro_valido)
        
        # Verificamos éxito (201) o si ya existe (400/500 según tu lógica)
        self.assertIn(response.status_code, [200, 201, 400])

    def test_02_health_check(self):
        """CP-02: Prueba de humo rápida de conectividad"""
        response = requests.get(f"{self.BASE_URL}/health")
        self.assertEqual(response.status_code, 200)

    def test_03_simulacion_correcta(self):
        """CP-03: Probar cálculo usando datos seteados en setUpClass"""
        # Usamos la ruta directa para evitar el 404
        ruta = "http://backend:3100/api/simulate"
        response = requests.post(ruta, json=self.simulacion_valida)
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('data', response.json())

    def test_04_simulacion_erronea(self):
        """CP-04: Prueba de valores faltantes (Resultado Excepcional)"""
        ruta = "http://backend:3100/api/simulate"
        # Enviamos datos incompletos
        payload_incompleto = {"amount": 500000} 
        response = requests.post(ruta, json=payload_incompleto)
        
        self.assertEqual(response.status_code, 400)

    # -----------------------------------------------------
    # CIERRE
    # -----------------------------------------------------

    @classmethod
    def tearDownClass(cls):
        """
        PASO 2: Finalizar y limpiar.
        """
        print("\n[tearDownClass] Suite de pruebas completada.")
        print("[INFO] Todos los recursos de prueba han sido liberados.")

if __name__ == '__main__':
    unittest.main()


