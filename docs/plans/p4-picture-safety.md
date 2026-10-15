# P4 · Picture safety

**Acceptance (owner's request):** review the `pictures` bucket permissions and close what the review finds.

## Design (ADR 0045)

- Migration `20261106090000_picture_safety.sql`: param `pictures_per_folder_max`; `can_store_picture` needs a
  citizen for the citizens folder; `can_upload_picture` (cap) and `can_delete_picture` (not in use) behind the
  insert and delete policies; a new select policy `pictures_select`; the three `set_*` picture functions return the
  replaced picture; `admin_resolve_report` gains `clear_profile`; `admin_list_reports` returns the citizen's
  picture and description.
- Web: `storage.remove`, `dropReplaced` after each picture change, report button on friend rows, the moderators'
  «Quitar foto y descripción».

## Tests

- pgTAP `400_picture_safety.test.sql` (20): no citizen no upload, the cap and its policy, replaced pictures
  returned, in-use pictures kept, deleting frees room, someone else's folder, clearing a reported citizen and its
  log.
- Vitest: the replaced picture is deleted, reporting a friend, clearing a reported citizen.
