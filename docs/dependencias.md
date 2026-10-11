# Revisión de dependencias

Consulta del registro npm el 10 de octubre de 2026, antes de instalar. Versiones fijadas en package.json y resolución transitiva en package-lock.json.

Next.js 16.4.0 requiere Node >=20.9; Supabase JS 2.117.3 requiere Node >=22; Vitest 5.0.3 requiere 22.12 o superior en Node 22. Host actual: Node 22.13.1. React y React DOM 19.3.0 satisfacen los peers de Next. TypeScript 5.9.3 se selecciona para evitar introducir la migración a una nueva versión mayor del compilador durante las fundaciones.

Next, React, Supabase, Tailwind y Vitest: MIT. TypeScript y Playwright: Apache-2.0. Fuentes Montserrat e Inter: OFL-1.1, servidas localmente con Fontsource. Tailwind y Next usan paquetes nativos precompilados; instalación inicial con scripts de ciclo de vida deshabilitados.

AI Design Skills se aplica como guía adaptada, documentada en [diseño](diseno.md) y referenciada por `AGENTS.md`. No se instaló como paquete ni skill global; el manual STYLO prevalece. Scroll World sigue como referencia para una etapa posterior. No hay servicios de generación, videos ni herramientas audiovisuales en el runtime.

Se incorporaron siete paths SVG de Phosphor Icons regular, después de revisar su contenido y licencia MIT. Se sirven desde el componente local `Icon`, sin nueva dependencia npm ni petición externa del navegador. La licencia se conserva en [docs/licenses/phosphor-icons.txt](licenses/phosphor-icons.txt). Las animaciones utilizan APIs nativas del navegador y CSS.

PGlite 0.5.8 (Apache-2.0) se usa únicamente en tests: PostgreSQL en memoria para verificar restricciones, migración y RLS, con helpers mínimos de Auth/Storage. No es una dependencia del runtime ni sustituye la prueba contra Supabase real.

Ejecutar npm audit al cambiar dependencias y mantener actualizaciones de seguridad. Una auditoría sin alertas conocidas no equivale a una garantía de ausencia de vulnerabilidades.

## Incorporaciones de Fase 2

`read-excel-file` 9.3.12, MIT, Node >=18: lectura de `.xlsx`, después de consultar registro npm, dependencias y [documentación del proyecto](https://github.com/catamphetamine/read-excel-file). Se importa bajo demanda con la entrada `universal` y la API `readSheet`. Los números se reciben como texto para convertir precios a centavos sin operaciones de coma flotante. La aplicación comprueba límites del archivo y del directorio ZIP antes de leerlo; no se ejecutan fórmulas. La lectura funciona en las pruebas Node y en el navegador compilado.

`prettier` 3.9.10, MIT, Node >=14: herramienta de desarrollo para dar formato legible a los componentes y reglas nuevas; no forma parte del runtime. Versiones y licencias consultadas en el registro npm antes de instalar. Ambas incorporaciones se instalaron con scripts deshabilitados. La auditoría posterior de 100 paquetes no reportó vulnerabilidades conocidas.
