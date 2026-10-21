---
name: stylo-db-migration
description: Preparar y revisar migraciones futuras de PostgreSQL y Supabase en STYLO cuando el usuario solicite cambiar esquema, funciones, permisos o RLS. No usar para tareas sin cambios de base.
---

# Migraciones futuras de STYLO

Usar esta guía solo cuando el cambio de base esté dentro del alcance autorizado. Leer las migraciones existentes en `supabase/migrations` y los tests de PostgreSQL antes de diseñar otra. Separar ampliación, traslado de datos y eliminación de contratos antiguos cuando la compatibilidad lo requiera; comprobar también ramas o código aún pendiente de integrar.

Revisar RLS, grants y funciones `security definer` conforme a los patrones y permisos concretos de STYLO. No copiar sin análisis la política SQL de Shipkit. Probar la migración y sus consultas de control en una base local o de prueba, y ejecutar los tests de base pertinentes. La vista previa local no demuestra permisos de administración real.

Documentar efectos sobre datos existentes, compatibilidad con la aplicación en ejecución, modo de verificación y riesgos de reversión. No aplicar cambios en la base real ni regenerar configuraciones de Supabase fuera de la solicitud específica.
