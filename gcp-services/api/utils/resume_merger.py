"""
Resume content merging with source metadata normalization.

Handles the complex logic of merging partial resume updates with existing content
while preserving source attribution and metadata.
"""

from typing import Any, Dict, Optional


def normalize_source_object(input_val: Any) -> Dict[str, Any]:
    """
    Normalize various source formats to standard source object.

    Handles:
    1. null/undefined → { type: "user_input" }
    2. { type: "document", name: "..." } → pass through
    3. ["user_input"] → { type: "user_input" }
    4. ["document.pdf"] → { type: "document", name: "document.pdf" }
    5. "user_input" string → { type: "user_input" }
    6. "document.pdf" string → { type: "document", name: "document.pdf" }

    Args:
        input_val: Source value in various formats

    Returns:
        Normalized source object with 'type' field
    """
    if not input_val:
        return {"type": "user_input"}

    # Already a source object
    if isinstance(input_val, dict) and "type" in input_val:
        return input_val

    # Legacy array form
    if isinstance(input_val, list) and len(input_val) > 0:
        first = input_val[0]
        if isinstance(first, dict) and "type" in first:
            return first
        if isinstance(first, str):
            normalized = first.lower().strip()
            if normalized in ("user_input", "user input"):
                return {"type": "user_input"}
            return {"type": "document", "name": first}

    # Legacy string source
    if isinstance(input_val, str):
        normalized = input_val.lower().strip()
        if normalized in ("user_input", "user input"):
            return {"type": "user_input"}
        return {"type": "document", "name": input_val}

    return {"type": "user_input"}


def merge_resume_updates(
    existing_content: Dict[str, Any],
    resume_updates: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Merge partial resume updates with existing content.

    Preserves rich format ({ value, source, warnings, other_values }) and handles
    both metadata-enriched and plain updates.

    Args:
        existing_content: Current resume content (flat)
        resume_updates: Partial updates to merge
        metadata: Optional metadata dict with source info per field

    Returns:
        Merged content with all fields in rich format
    """
    final_content = {}
    root_keys = {}

    # Separate root-level reserved keys from field updates
    for key, value in resume_updates.items():
        if key == "_metadata":
            continue
        if key.startswith("_") or key in ("projectSections", "borrowerSections"):
            root_keys[key] = value

    # Process field updates with metadata if present
    if metadata:
        for key, value in resume_updates.items():
            if key == "_metadata" or key.startswith("_") or key in (
                "projectSections",
                "borrowerSections",
            ):
                continue

            meta = metadata.get(key, {})
            existing_item = existing_content.get(key)

            # Determine primary source
            primary_source_input = meta.get("source") or (
                meta["sources"][0] if isinstance(meta.get("sources"), list) and meta["sources"] else None
            )

            final_content[key] = {
                "value": value,
                "source": normalize_source_object(primary_source_input),
                "warnings": meta.get("warnings", []),
                "other_values": meta.get("other_values", []),
            }
    else:
        # No metadata - merge values but preserve existing rich format
        for key, value in resume_updates.items():
            if key == "_metadata" or key.startswith("_") or key in (
                "projectSections",
                "borrowerSections",
            ):
                continue

            existing_item = existing_content.get(key)

            # Check if existing has rich format
            if (
                existing_item
                and isinstance(existing_item, dict)
                and ("value" in existing_item or "source" in existing_item or "sources" in existing_item)
            ):
                # Preserve existing metadata structure
                existing_primary_source_input = (
                    existing_item.get("source")
                    or (
                        existing_item["sources"][0]
                        if isinstance(existing_item.get("sources"), list) and existing_item["sources"]
                        else None
                    )
                )

                final_content[key] = {
                    "value": value,
                    "source": normalize_source_object(existing_primary_source_input),
                    "warnings": existing_item.get("warnings", []),
                    "other_values": existing_item.get("other_values", []),
                }
            else:
                # Convert to rich format (user input)
                final_content[key] = {
                    "value": value,
                    "source": normalize_source_object(None),
                    "warnings": [],
                    "other_values": [],
                }

    # Preserve existing fields not in updates (copy from existing)
    for key, value in existing_content.items():
        if key not in final_content and key not in root_keys:
            # Normalize existing content to rich format if needed
            if (
                value
                and isinstance(value, dict)
                and ("value" in value or "source" in value or "sources" in value)
            ):
                # Already rich format - normalize source
                existing_primary_source_input = (
                    value.get("source")
                    or (
                        value["sources"][0]
                        if isinstance(value.get("sources"), list) and value["sources"]
                        else None
                    )
                )
                final_content[key] = {
                    "value": value.get("value"),
                    "source": normalize_source_object(existing_primary_source_input),
                    "warnings": value.get("warnings", []),
                    "other_values": value.get("other_values", []),
                }
            elif value is not None and not isinstance(value, dict):
                # Flat value - convert to rich format
                final_content[key] = {
                    "value": value,
                    "source": normalize_source_object(None),
                    "warnings": [],
                    "other_values": [],
                }
            else:
                # Keep as-is (dict without value/source, or None)
                final_content[key] = value

    # Safety check: ensure all non-root keys are in rich format
    for key, item in list(final_content.items()):
        if item is not None and isinstance(item, dict) and "value" in item:
            # Normalize source field
            primary_source_input = (
                item.get("source")
                or (
                    item["sources"][0]
                    if isinstance(item.get("sources"), list) and item["sources"]
                    else None
                )
            )
            final_content[key] = {
                "value": item["value"],
                "source": normalize_source_object(primary_source_input),
                "warnings": item.get("warnings", []),
                "other_values": item.get("other_values", []),
            }
        elif item is not None and not isinstance(item, dict):
            # Flat value found - convert
            final_content[key] = {
                "value": item,
                "source": normalize_source_object(None),
                "warnings": [],
                "other_values": [],
            }

    # Merge root keys (excluding _lockedFields which is now in column)
    locked_fields = root_keys.pop("_lockedFields", None)
    result = {**root_keys, **final_content}

    return result, locked_fields
