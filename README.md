# 📚 Sistema de Cargue Repositorio Digitk

Automatización completa desarrollada con **Google Apps Script** que gestiona el proceso de depósito de trabajos de grado al repositorio institucional **Digitk** de Areandina, desde la recepción del formulario hasta la confirmación de publicación.

---

## 📌 ¿Qué hace?

1. Muestra un formulario web de 4 pasos (HTML desplegado como Web App)
2. El estudiante completa sus datos, selecciona facultad/programa y adjunta 3 PDFs
3. Al enviar, el sistema:
   - Crea automáticamente la estructura de carpetas en Drive (`Facultad → Programa → Sede → Autor Año`)
   - Sube los 3 archivos PDF desde base64 a esa carpeta
   - Comparte la carpeta con el solicitante
   - Registra la solicitud en la hoja **Control Digitk** del Spreadsheet
   - Envía correo de confirmación al estudiante con link a su carpeta y su ID único
   - Notifica al bibliotecólogo responsable según sede y facultad, con botones de acción directa
4. El bibliotecólogo puede aprobar, marcar como incompleto, rechazar o confirmar el cargue en Digitk desde el correo, sin abrir la hoja
5. Cada acción actualiza el estado en la hoja y notifica al estudiante por correo
6. Un trigger diario alerta al colaborador si una solicitud lleva más de 3 días sin revisión
7. Al confirmar cargue en Digitk, la carpeta se mueve automáticamente a `Proceso terminado`

---

## 🗂️ Archivos del proyecto

automatizacion-02-SISTEMA REPOSITORIO/
├── Formulario.html      # Interfaz web multistep (4 pasos) servida como Web App
├── Código.gs            # doGet / doPost — entrada de la Web App + acciones de gestión
├── Procesador.gs        # procesarFormulario() — llamado por google.script.run desde el HTML
├── Utilidades.gs        # Drive, correos, triggers, setup, menú, ID único
├── config.example.gs    # ⚙️ Plantilla de configuración (sin datos reales)
└── README.md            # Esta documentación

---

## 🛠️ Tecnologías utilizadas

- Google Apps Script (Web App `doGet` / `doPost`)
- Google Drive (`DriveApp` — creación de carpetas, subida de archivos desde base64)
- Google Sheets (`SpreadsheetApp` — registro y control de estados)
- Gmail (`GmailApp` — correos HTML a estudiantes y bibliotecólogos)
- `HtmlService` — formulario multistep servido como Web App
- `ScriptApp` — triggers programados + URL de la Web App para botones de acción
- `Utilities.base64Decode` + `newBlob` — manejo de archivos PDF

---

## ⚙️ Prerrequisitos

- Cuenta de Google Workspace institucional (`@areandina.edu.co`)
- Un **Google Spreadsheet** con dos hojas creadas por el setup:
  - `Control Digitk` — registro de solicitudes
  - `Colaboradores` — directorio de bibliotecólogos por sede y facultad
  - `Dashboard` — resumen (expandible)
- Una **carpeta raíz en Google Drive** donde se organizarán todas las solicitudes
- El script desplegado como **Web App** (acceso: cualquier usuario de la organización)

---

## 🔧 Configuración antes de desplegar

Abre `config.example.gs`, renómbralo a `config.gs` y reemplaza los valores:

```JavaScript

const CONFIG = {
  SHEET_ID:                   "ID_DE_TU_SPREADSHEET",
  DRIVE_ROOT_FOLDER_ID:       "ID_DE_TU_CARPETA_RAIZ_EN_DRIVE",
  CORREO_ADMIN:               "tucorreo@areandina.edu.co",
  DOMINIO_INSTITUCIONAL:      "@areandina.edu.co",
  NOMBRE_SISTEMA:             "Sistema de Cargue Repositorio Digitk",
  NOMBRE_INSTITUCION:         "Fundación Universitaria del Área Andina",
  NOMBRE_CARPETA_TERMINADOS:  "Proceso terminado",
  HOJA_RESPUESTAS:            "Respuestas de formulario 1",
  DIAS_RECORDATORIO:          5,
  DIAS_ALERTA_BIBLIOTECARIO:  3
};
```

---

## 🚀 Paso a paso de despliegue

**1. Crea el Spreadsheet**
   - Copia el ID desde la URL: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`

**2. Crea la carpeta raíz en Drive**
   - Copia el ID desde la URL de la carpeta

**3. Abre Apps Script**
   - Ve a [script.google.com](https://script.google.com) → Nuevo proyecto
   - Crea los archivos: `Código.gs`, `Procesador.gs`, `Utilidades.gs`, `config.gs`, `Formulario.html`
   - Pega el contenido de cada uno

**4. Ejecuta el Setup**
   - Guarda el proyecto y recarga
   - En el Spreadsheet aparecerá el menú **Sistema Digitk**
   - Haz clic en **Setup Inicial** → se crearán las hojas y el trigger diario

**5. Ajusta los colaboradores**
   - En la hoja `Colaboradores`, edita los correos y las facultades asignadas a cada bibliotecólogo
   - Columna `Facultades`: nombres separados por coma, exactamente como aparecen en el formulario

**6. Despliega como Web App**
   - En el editor: **Implementar → Nueva implementación**
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo (tu cuenta institucional)**
   - Acceso: **Cualquier usuario de la organización** (o cualquier usuario si es interinstitucional)
   - Copia la URL generada — esa es la URL del formulario

**7. Envía instrucciones a colaboradores**
   - En el Spreadsheet: **Sistema Digitk → Enviar instrucciones filtro Gmail**
   - Cada bibliotecólogo recibirá un correo para configurar su etiqueta Digitk

**8. Prueba**
   - Abre la URL del formulario
   - Completa los 4 pasos con un correo `@areandina.edu.co` y archivos PDF de prueba
   - Verifica que se cree la carpeta en Drive y lleguen los correos

---

## 🔗 Diagrama de interconexión

```
Estudiante (navegador)
        │
        │  Web App URL (doGet)
        ▼
   Formulario.html ── 4 pasos ──▶ google.script.run.procesarFormulario()
                                           │
                                     Procesador.gs
                          ┌──────────────────┼──────────────────┐
                          ▼                  ▼                  ▼
                      DriveApp        SpreadsheetApp         GmailApp
                 Crea carpetas,     Registra fila en     ┌─────────────────┐
                 sube 3 PDFs,       Control Digitk       │  Confirmación   │
                 comparte link                           │  → Estudiante   │
                                                         ├─────────────────┤
                                                         │  Notificación   │
                                                         │  → Bibliotecario│
                                                         │  [APROBAR]      │
                                                         │  [RECHAZAR]     │
                                                         │  [INCOMPLETO]   │
                                                         │  [DIGITK]       │
                                                         └────────┬────────┘
                                                                  │
                                                  doGet (acción + id)
                                                                  │
                                                            Código.gs
                                                  Actualiza estado en hoja
                                                  + correo al estudiante
                                                                  │
                                          Si DIGITK ─────────────▼
                                                         Drive: carpeta →
                                                       "Proceso terminado"

Trigger diario (8:00 a.m.)
        │
        ▼
revisionDiaria()
→ Alerta al colaborador si solicitud lleva +3 días sin revisión
```

---

## 👥 Lógica de asignación de colaboradores

El sistema enruta cada solicitud al bibliotecólogo correcto usando una cascada:

1. **Match exacto**: busca colaborador activo cuya `Sede` Y `Facultad` coincidan
2. **Fallback de sede**: si no hay match de facultad, toma cualquier activo de esa sede
3. **Último recurso**: `CORREO_ADMIN` definido en `config.gs`

La asignación se gestiona desde la hoja `Colaboradores` sin tocar el código.

---

## 📊 Estados del sistema

| Estado | Significado |
|---|---|
| `Recibido — archivos en Drive` | Formulario enviado, archivos subidos |
| `En revisión` | Bibliotecólogo revisando |
| `Incompleto` | Documentación incompleta, estudiante notificado |
| `Aprobado — pendiente Digitk` | Listo para cargar al repositorio |
| `Cargado en Digitk` | Publicado, carpeta movida a terminados |
| `Rechazado` | No cumple criterios |

---

## 📝 Notas

- Cada nueva implementación de la Web App genera una URL diferente; actualiza los enlaces si reimplementas
- Los botones de acción en el correo del bibliotecólogo apuntan a la URL de la Web App actual — si reimplementas, los correos antiguos quedarán con URLs viejas
- El formulario valida que el correo termine en `@areandina.edu.co` tanto en el cliente (HTML) como en el servidor (Procesador.gs)
- Los archivos PDF se transfieren en base64 desde el navegador; no se almacenan en el servidor

---
