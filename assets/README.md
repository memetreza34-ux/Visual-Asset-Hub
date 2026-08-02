# Freigegebene Assets

Unter `assets/` liegen ausschließlich katalogisierte und freigegebene Originaldateien.

```text
assets/{type}/{category}/{filename}
```

Große Video- und Bilddateien werden durch `.gitattributes` über Git LFS verwaltet. Vor dem ersten Medien-Commit muss Git LFS lokal installiert und mit `git lfs install` aktiviert sein.

Dateien nicht manuell in diesen Ordner kopieren. Der bevorzugte Weg ist:

```bash
npm run asset:add -- --help
```

Der Importbefehl erzeugt einen standardisierten Namen, berechnet den SHA-256-Hash, erstellt den Katalogeintrag und rollt bei einer fehlgeschlagenen Prüfung zurück.
