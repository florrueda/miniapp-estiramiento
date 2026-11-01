# Mini Flor

Una mini Flor que tipea en su compu en una esquina de la pantalla y, cada 30 minutos, te recuerda pararte y estirarte.

Vive arriba de todas las ventanas sin molestar: los clicks pasan de largo salvo cuando tocás el personaje o el globito.

## Instalación

Descargá el instalador de la última versión desde **[Releases](https://github.com/florrueda/miniapp-estiramiento/releases/latest)**.

### Windows

1. Descargá `Mini Flor Setup x.x.x.exe` y abrilo.
2. Si aparece **"Windows protegió su PC"**, tocá **Más información** → **Ejecutar de todas formas**. Aparece porque la app no tiene una firma digital paga, no porque tenga algo raro.
3. Seguí el instalador. Mini Flor aparece en la esquina inferior derecha.

### Mac

1. Descargá `Mini Flor-x.x.x-universal.dmg` (funciona en Mac con Intel y con chip M).
2. Abrilo y arrastrá **Mini Flor** a **Aplicaciones**.
3. La primera vez que la abras, macOS la va a bloquear porque no está firmada por Apple. Andá a **Configuración del Sistema → Privacidad y seguridad**, bajá hasta el aviso de Mini Flor y tocá **Abrir igual**.

Si dice que la app "está dañada", abrí la Terminal y corré:

```
xattr -cr "/Applications/Mini Flor.app"
```

## Cómo se usa

- **Cada 30 minutos** Mini Flor se para, hace un ejercicio y te muestra una sugerencia en un globito.
  - **Listo, me estiré** reinicia el contador de 30 minutos.
  - **En 5 min** pospone el recordatorio.
- **Pasá el mouse** sobre ella para ver cuánto falta para la próxima pausa.
- **Arrastrala** a donde quieras. Recuerda la posición para la próxima vez.
- **Si dejás la PC 5 minutos o más**, lo cuenta como pausa y reinicia el contador.

Los ejercicios van rotando: brazos arriba, hombros, cuello, puntas de pie e inclinación lateral.

### Menú de la bandeja

Mini Flor no aparece en la barra de tareas. Se maneja desde el circulito rosa en la bandeja del sistema (al lado del reloj en Windows, arriba a la derecha en Mac):

- **Estirarme ahora**: lanza el recordatorio en el momento.
- **Mostrar / Ocultar**: la esconde sin cerrarla. Cuando llega la pausa vuelve a aparecer sola.
- **Iniciar con Windows**: hace que se abra sola al prender la compu. Viene activado.
- **Salir**: la cierra.

## Desinstalar

- **Windows:** Configuración → Aplicaciones → Mini Flor → Desinstalar.
- **Mac:** arrastrá Mini Flor desde Aplicaciones a la Papelera.

## Para desarrollar

Necesitás [Node.js](https://nodejs.org) 20 o más nuevo.

```
npm install
npm start
```

| Comando | Qué hace |
| --- | --- |
| `npm start` | Abre la app en modo desarrollo |
| `npm run dist` | Genera el instalador de Windows en `dist/` |
| `npm run dist:mac` | Genera el `.dmg` de Mac (solo funciona desde una Mac) |

### Archivos

| Archivo | Qué tiene |
| --- | --- |
| `main.js` | Proceso principal de Electron: ventana flotante transparente, bandeja, inicio automático, detección de inactividad y posición guardada |
| `renderer.js` | Lógica del recordatorio, rotación de ejercicios y animaciones |
| `index.html` | El personaje, el globito y los estilos |
| `preload.js` | Puente entre `renderer.js` y `main.js` |
| `assets/` | Hojas de cuadros de las animaciones y poses del personaje |
| `build/icon.png` | Ícono de la app (512×512) |

Los tiempos se cambian al principio de los archivos: `INTERVAL` y `SNOOZE` en `renderer.js`, `IDLE_SECONDS` en `main.js`. Los ejercicios y sus textos están en `EXERCISES`, en `renderer.js`.

La configuración del usuario (posición y si arranca con la compu) se guarda en `config.json`, dentro de `%APPDATA%\Mini Flor` en Windows o `~/Library/Application Support/Mini Flor` en Mac.

### Publicar una versión nueva

GitHub Actions compila los instaladores de Windows y Mac y los publica en Releases cada vez que subís un tag que empieza con `v`:

1. Cambiá `"version"` en `package.json` (por ejemplo a `1.0.2`) y hacé commit.
2. Subí el tag:
   ```
   git push
   git tag v1.0.2
   git push origin v1.0.2
   ```
3. En unos 10 minutos aparecen el `.exe` y el `.dmg` en Releases. El progreso se ve en la pestaña **Actions**.

También se puede correr a mano desde **Actions → Build → Run workflow**. En ese caso los instaladores quedan como archivos descargables de esa ejecución y no se publican en Releases.
