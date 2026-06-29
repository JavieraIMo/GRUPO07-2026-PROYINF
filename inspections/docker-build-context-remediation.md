# Remediación de issue Docker por copia recursiva de contexto

## Contexto del issue
SonarCloud detecto una vulnerabilidad asociada a Dockerfile por copia recursiva del contexto de build.

Regla reportada:
- docker:S6470

Tipo y severidad:
- Tipo: Vulnerability
- Severidad: Critical/High (segun vista de Sonar)

Riesgo identificado:
- Inclusión accidental de archivos sensibles o innecesarios en la imagen.
- Aumento de superficie de ataque.
- Imagen más grande y menos controlada.

## Archivos intervenidos
- backend/Dockerfile
- backend/.dockerignore

## Estado antes
En Dockerfile se utilizaba:
- COPY . .

Ese patrón copia todo el contexto de build de forma amplia.

## Correccion aplicada
1. Se reemplazo la copia recursiva por copias explícitas de artefactos necesarios.
2. Se reforzo el filtrado de contexto con reglas adicionales en .dockerignore.

Cambios clave aplicados:
- Se copian solo archivos y carpetas requeridas para ejecucion del backend.
- Se excluyen archivos de pruebas, logs, llaves/certificados y carpetas de IDE.

## Resultado esperado en re-inspeccion Sonar
- Reducción o cierre del issue docker:S6470.
- Menor riesgo de filtracion de información en imagen.
- Mejora verificable en seguridad de despliegue.

## Verificacion técnica realizada
1. Reconstrucción de contenedores:
   - docker compose down
   - docker compose up -d --build
2. Confirmación de que backend inicia correctamente tras cambios de Dockerfile.
3. Re-ejecución de SonarCloud para validar estado del issue.

## Evidencia sugerida para la entrega
- Screenshot del issue en estado inicial (antes).
- Screenshot del Dockerfile corregido.
- Screenshot de .dockerignore reforzado.
- Screenshot del estado del issue en reinspección (despues).

## Relacion con HUs
Este issue es transversal de infraestructura, pero impacta la ejecución segura y estable de funcionalidades backend asociadas a:

- HU-12 Captura automatica de datos
- HU-13 Evaluacion de riesgo
- HU-5 Solicitud de prestamo