# Web workers (gepland)
`raycast-worker`: scan buiten de UI-thread (prestaties stap 1, ±½ dag, 3–6× winst).
Let op: in de offline build moet de worker inline komen (Blob-URL), want Toledo en file:// laden geen apart bestand.
