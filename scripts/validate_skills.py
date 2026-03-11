"""
Kiro Skills Validator v2 — PyYAML strict parsing
~/.kiro/skills altindaki tum skill klasorlerini tarar.
Kiro'nun YAML parser'iyla ayni sekilde strict parse yapar.

Hata Tipleri:
  E001: SKILL.md bulunamadi
  E002: SKILL.md bos
  E003: SKILL.md okunamadi
  E004: Frontmatter blogu (--- ... ---) yok
  E005: YAML parse hatasi (Kiro'nun da reject ettigi)
  E006: 'name' alani eksik
  E007: 'description' alani eksik
  E008: Frontmatter'da sadece name+description olmali (ekstra alan)
  W001: Klasor adi ile name uyumsuz
  W002: Description cok kisa
  W003: Duplike dosyalar
  W004: Bos klasor
"""

import os
import re
import sys
import yaml
from pathlib import Path

SKILLS_DIR = Path.home() / ".kiro" / "skills"

# Kiro'nun kabul ettigi frontmatter alanlari
ALLOWED_FIELDS = {"name", "description"}


def extract_frontmatter_raw(content: str) -> tuple[str | None, str | None]:
    """Frontmatter raw string'ini cikar."""
    match = re.match(r'^---[ \t]*\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return None, "E004: Frontmatter blogu (--- ... ---) bulunamadi"
    return match.group(1), None


def parse_yaml_strict(raw_yaml: str) -> tuple[dict | None, str | None]:
    """PyYAML ile strict parse — Kiro'nun davranisini taklit eder."""
    try:
        data = yaml.safe_load(raw_yaml)
        if not isinstance(data, dict):
            return None, "E005: Frontmatter dict degil, parse sonucu: " + str(type(data).__name__)
        return data, None
    except yaml.YAMLError as e:
        msg = str(e).split('\n')[0]  # Sadece ilk satir
        return None, f"E005: YAML parse hatasi: {msg}"


def validate_skill(skill_dir: Path) -> list[dict]:
    """Tek bir skill klasorunu dogrula."""
    issues = []
    skill_name = skill_dir.name

    # Bos klasor
    all_files = list(skill_dir.rglob("*"))
    if not all_files:
        issues.append({"skill": skill_name, "code": "W004", "severity": "WARNING",
                        "issue": "Bos klasor — hicbir dosya yok"})
        return issues

    # SKILL.md var mi?
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        issues.append({"skill": skill_name, "code": "E001", "severity": "ERROR",
                        "issue": "SKILL.md bulunamadi"})
        return issues

    # Oku
    try:
        content = skill_md.read_text(encoding="utf-8")
    except Exception as e:
        issues.append({"skill": skill_name, "code": "E003", "severity": "ERROR",
                        "issue": f"SKILL.md okunamadi: {e}"})
        return issues

    if not content.strip():
        issues.append({"skill": skill_name, "code": "E002", "severity": "ERROR",
                        "issue": "SKILL.md dosyasi bos"})
        return issues

    # Duplike dosyalar
    dupes = list(skill_dir.glob("SKILL_*.md")) + list(skill_dir.rglob("*_merged_*"))
    if dupes:
        issues.append({"skill": skill_name, "code": "W003", "severity": "WARNING",
                        "issue": f"Duplike dosyalar: {[f.name for f in dupes[:5]]}"})

    # Frontmatter cikar
    raw_fm, fm_err = extract_frontmatter_raw(content)
    if fm_err:
        issues.append({"skill": skill_name, "code": "E004", "severity": "ERROR",
                        "issue": fm_err})
        return issues

    # PyYAML strict parse
    data, parse_err = parse_yaml_strict(raw_fm)
    if parse_err:
        issues.append({"skill": skill_name, "code": "E005", "severity": "ERROR",
                        "issue": parse_err})
        return issues

    # name kontrolu
    name_val = data.get("name", "")
    if not name_val or not str(name_val).strip():
        issues.append({"skill": skill_name, "code": "E006", "severity": "ERROR",
                        "issue": "'name' alani eksik veya bos"})
    elif str(name_val).strip() != skill_name:
        issues.append({"skill": skill_name, "code": "W001", "severity": "WARNING",
                        "issue": f"name='{name_val}' != klasor='{skill_name}'"})

    # description kontrolu
    desc_val = data.get("description", "")
    if not desc_val or not str(desc_val).strip():
        issues.append({"skill": skill_name, "code": "E007", "severity": "ERROR",
                        "issue": "'description' alani eksik veya bos"})
    elif len(str(desc_val).strip()) < 10:
        issues.append({"skill": skill_name, "code": "W002", "severity": "WARNING",
                        "issue": f"Description cok kisa ({len(str(desc_val).strip())} chr)"})

    # Ekstra alanlar (Kiro sadece name+description kabul eder)
    extra = set(data.keys()) - ALLOWED_FIELDS
    if extra:
        issues.append({"skill": skill_name, "code": "E008", "severity": "ERROR",
                        "issue": f"Ekstra alanlar (Kiro reject eder): {sorted(extra)}"})

    return issues


def main():
    if not SKILLS_DIR.exists():
        print(f"HATA: {SKILLS_DIR} bulunamadi")
        sys.exit(1)

    skill_dirs = sorted([
        d for d in SKILLS_DIR.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    ])

    print(f"Taranan klasor: {SKILLS_DIR}")
    print(f"Toplam skill klasoru: {len(skill_dirs)}")
    print("=" * 80)

    all_issues = []
    error_skills = set()
    warning_skills = set()
    clean_count = 0

    for skill_dir in skill_dirs:
        issues = validate_skill(skill_dir)
        if issues:
            all_issues.extend(issues)
            for i in issues:
                if i["severity"] == "ERROR":
                    error_skills.add(i["skill"])
                else:
                    warning_skills.add(i["skill"])
        else:
            clean_count += 1

    # Hata koduna gore grupla
    by_code = {}
    for i in all_issues:
        by_code.setdefault(i["code"], []).append(i)

    for code in sorted(by_code.keys()):
        items = by_code[code]
        sev = items[0]["severity"]
        print(f"\n[{sev}] {code} — {len(items)} adet:")
        for i in items:
            print(f"  {i['skill']}: {i['issue']}")

    # Ozet
    only_warn = warning_skills - error_skills
    print(f"\n{'='*80}")
    print(f"  OZET")
    print(f"{'='*80}")
    print(f"  Toplam skill     : {len(skill_dirs)}")
    print(f"  Temiz (sorunsuz) : {clean_count}")
    print(f"  Hatali (ERROR)   : {len(error_skills)}")
    print(f"  Sadece WARNING   : {len(only_warn)}")
    print(f"{'='*80}")


if __name__ == "__main__":
    main()
