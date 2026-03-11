"""
Kiro Skills Auto-Fixer
Hatali SKILL.md frontmatter'larini otomatik duzeltir.

Fix stratejisi:
  1. Frontmatter'i raw text olarak cikar
  2. name ve description degerlerini akilli regex ile bul
  3. Temiz frontmatter yaz: sadece name + description (tek satir, quoted)
  4. Ekstra alanlari (metadata, allowed-tools, license, vb.) kaldir
  5. Icerik kismini (frontmatter sonrasi) aynen koru

Kullanim:
  python scripts/fix_skills.py              # Dry-run (degisiklik yapmaz)
  python scripts/fix_skills.py --apply      # Gercekten duzelt
  python scripts/fix_skills.py --apply --backup  # Yedekle + duzelt
"""

import os
import re
import sys
import shutil
import yaml
from pathlib import Path

SKILLS_DIR = Path.home() / ".kiro" / "skills"
ALLOWED_FIELDS = {"name", "description"}


def extract_frontmatter_and_body(content: str) -> tuple[str | None, str | None]:
    """Frontmatter raw + body ayir."""
    match = re.match(r'^---[ \t]*\n(.*?)\n---[ \t]*\n?(.*)', content, re.DOTALL)
    if not match:
        return None, content
    return match.group(1), match.group(2)


def is_yaml_valid(raw: str) -> bool:
    """PyYAML ile parse edilebiliyor mu?"""
    try:
        data = yaml.safe_load(raw)
        return isinstance(data, dict)
    except:
        return False


def has_extra_fields(raw: str) -> list[str]:
    """Ekstra alanlari tespit et."""
    try:
        data = yaml.safe_load(raw)
        if isinstance(data, dict):
            return sorted(set(data.keys()) - ALLOWED_FIELDS)
    except:
        pass
    return []


def extract_name_from_raw(raw: str, folder_name: str) -> str:
    """name degerini raw frontmatter'dan cikar."""
    m = re.search(r'^name:\s*["\']?([^"\'\n]+)', raw, re.MULTILINE)
    if m:
        return m.group(1).strip().strip('"').strip("'")
    return folder_name


def extract_description_from_raw(raw: str) -> str:
    """description degerini raw frontmatter'dan akilli cikar.

    Tum pattern'leri destekler:
      description: "tek satir"
      description: "multiline devam"
        indented continuation
      description: ">"
        indented continuation (quoted > with continuation)
      description: >-
        multiline text
      description:Bosluksuz text
        devam eden satirlar
      description: tek satir tirnak yok
    """
    lines = raw.split('\n')
    desc_start = -1

    for i, line in enumerate(lines):
        if line.startswith('description'):
            desc_start = i
            break

    if desc_start == -1:
        return ""

    first_line = lines[desc_start]

    # "description:" sonrasini al
    after_key = re.sub(r'^description\s*:\s*', '', first_line)

    # Indented devam satirlarini topla (description'dan sonraki tum indented satirlar)
    continuation_lines = []
    for j in range(desc_start + 1, len(lines)):
        line = lines[j]
        if line and (line[0] == ' ' or line[0] == '\t'):
            continuation_lines.append(line.strip())
        else:
            break

    # >- veya > multiline indicator (unquoted)
    if after_key.strip() in ('>-', '>', '|', '|-'):
        return ' '.join(continuation_lines)

    # Quoted string
    quote_char = None
    if after_key.startswith('"'):
        quote_char = '"'
    elif after_key.startswith("'"):
        quote_char = "'"

    if quote_char:
        # Ilk satirdaki icerik (tirnak sonrasi)
        inner_first = after_key[1:]  # Acilis tirnagin sonrasi

        # Kapanan tirnak var mi ilk satirda?
        if inner_first.rstrip().endswith(quote_char):
            # Ilk satirda kapaniyor
            first_part = inner_first.rstrip()[:-1].strip()

            # ">" veya ">-" ise — devam satirlari gercek description
            if first_part in ('>', '>-', '|', '|-'):
                return ' '.join(continuation_lines)

            # Devam satirlari varsa onlari da ekle (quoted ama YAML multiline continuation)
            if continuation_lines:
                # Devam satirlarindaki tirnaklari temizle
                cont_text = ' '.join(continuation_lines)
                # Son tirnak varsa kaldir
                if cont_text.endswith(quote_char):
                    cont_text = cont_text[:-1]
                return (first_part + ' ' + cont_text).strip()

            return first_part

        # Ilk satirda kapanmiyor — multiline quoted
        parts = [inner_first.strip()]
        for cl in continuation_lines:
            if cl.endswith(quote_char):
                parts.append(cl[:-1].strip())
                break
            parts.append(cl)

        result = ' '.join(p for p in parts if p)
        # ">" prefix temizle
        if result.startswith('>-'):
            result = result[2:].strip()
        elif result.startswith('>'):
            result = result[1:].strip()
        return result

    # Unquoted — ilk satir + indented devam satirlari
    parts = [after_key.strip()]
    parts.extend(continuation_lines)
    return ' '.join(p for p in parts if p)



def escape_description(desc: str) -> str:
    """Description'i guvenli YAML string'e cevir."""
    if not desc:
        return '""'
    # Ic tirnaklari escape et
    desc = desc.replace('\\', '\\\\').replace('"', '\\"')
    return f'"{desc}"'


def build_clean_frontmatter(name: str, description: str) -> str:
    """Temiz frontmatter olustur."""
    escaped_desc = escape_description(description)
    return f"---\nname: {name}\ndescription: {escaped_desc}\n---"


def needs_fix(content: str) -> tuple[bool, str]:
    """Bu SKILL.md fix gerektiriyor mu? Neden?"""
    fm_raw, body = extract_frontmatter_and_body(content)
    if fm_raw is None:
        return False, "no-frontmatter"

    # YAML parse hatasi?
    if not is_yaml_valid(fm_raw):
        return True, "yaml-parse-error"

    # Ekstra alanlar?
    extras = has_extra_fields(fm_raw)
    if extras:
        return True, f"extra-fields: {extras}"

    return False, "clean"


def fix_skill(skill_dir: Path, apply: bool = False, backup: bool = False) -> dict | None:
    """Tek bir skill'i fix et. Sonuc dict dondur veya None (fix gerekmez)."""
    skill_name = skill_dir.name
    skill_md = skill_dir / "SKILL.md"

    if not skill_md.exists():
        return None

    try:
        content = skill_md.read_text(encoding="utf-8")
    except:
        return None

    if not content.strip():
        return None

    should_fix, reason = needs_fix(content)
    if not should_fix:
        return None

    fm_raw, body = extract_frontmatter_and_body(content)
    if fm_raw is None:
        return None

    # Degerleri cikar
    name = extract_name_from_raw(fm_raw, skill_name)
    description = extract_description_from_raw(fm_raw)

    if not description:
        description = f"Skill for {name}"

    # Yeni frontmatter olustur
    new_fm = build_clean_frontmatter(name, description)
    new_content = new_fm + "\n" + (body if body else "")

    # Dogrulama: yeni frontmatter parse edilebilmeli
    new_fm_raw, _ = extract_frontmatter_and_body(new_content)
    if new_fm_raw and not is_yaml_valid(new_fm_raw):
        return {"skill": name, "status": "FAIL", "reason": "fix sonrasi hala parse hatasi",
                "original_reason": reason}

    result = {
        "skill": name,
        "status": "FIXED" if apply else "WOULD-FIX",
        "reason": reason,
        "description_preview": description[:80] + ("..." if len(description) > 80 else "")
    }

    if apply:
        if backup:
            backup_path = skill_md.with_suffix(".md.bak")
            shutil.copy2(skill_md, backup_path)
        skill_md.write_text(new_content, encoding="utf-8")

    return result


def main():
    apply = "--apply" in sys.argv
    backup = "--backup" in sys.argv

    if not SKILLS_DIR.exists():
        print(f"HATA: {SKILLS_DIR} bulunamadi")
        sys.exit(1)

    skill_dirs = sorted([
        d for d in SKILLS_DIR.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    ])

    mode = "APPLY" if apply else "DRY-RUN"
    print(f"Mod: {mode}" + (" (+ backup)" if backup else ""))
    print(f"Taranan: {SKILLS_DIR}")
    print(f"Toplam skill: {len(skill_dirs)}")
    print("=" * 80)

    results = []
    for skill_dir in skill_dirs:
        r = fix_skill(skill_dir, apply=apply, backup=backup)
        if r:
            results.append(r)

    fixed = [r for r in results if r["status"] in ("FIXED", "WOULD-FIX")]
    failed = [r for r in results if r["status"] == "FAIL"]

    if fixed:
        print(f"\n{'DUZELTILDI' if apply else 'DUZELTILECEK'} ({len(fixed)} adet):")
        for r in fixed:
            print(f"  [{r['reason'][:30]}] {r['skill']}")
            print(f"    desc: {r['description_preview']}")

    if failed:
        print(f"\nBASARISIZ ({len(failed)} adet):")
        for r in failed:
            print(f"  {r['skill']}: {r['reason']}")

    print(f"\n{'='*80}")
    print(f"  Toplam fix: {len(fixed)}")
    print(f"  Basarisiz : {len(failed)}")
    if not apply:
        print(f"\n  Gercekten duzeltmek icin: python scripts/fix_skills.py --apply")
        print(f"  Yedekli duzeltme:         python scripts/fix_skills.py --apply --backup")
    print(f"{'='*80}")


if __name__ == "__main__":
    main()
