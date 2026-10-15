# 0045 · Picture safety

Date: 2026-11-04 · Status: Accepted

## Context

The owner asked for a review of the `pictures` bucket permissions (ADR 0041). The review found:

1. No limit on how many pictures a folder holds: any citizen could fill storage with 300 KB files.
2. Deleting a picture through Storage reads the rows first, and there was no select policy, so the delete policy
   never worked: replaced pictures piled up for good.
3. A player could delete the picture in use, leaving a broken image.
4. A signed-up account without a citizen could upload to its folder.
5. Moderation could not remove an offensive picture or description, and the web had no way to report a citizen.

## Decisions

1. **Cap per folder.** Each folder (a citizen, a party, a regiment) holds up to `pictures_per_folder_max` (10)
   pictures; `public.can_upload_picture` backs the insert policy. Concurrent uploads may pass the cap by a few.
2. **Deleting.** A select policy lets players see the names in the folders they write in (the pictures are
   public anyway). `public.can_delete_picture` refuses the picture a citizen, party or regiment shows.
3. **Replacing.** `set_my_avatar`, `set_party_emblem` and `set_regiment_emblem` return the picture they replaced,
   and the web deletes it. A failed delete only leaves an unused file and does not fail the action.
4. **Citizens only.** The citizens folder needs a citizen.
5. **Moderation.** A citizen can be reported from the friends list (friends and requests). For a reported citizen
   the moderators see the picture and description and can clear both (`clear_profile`); the admin log keeps what
   was cleared. The file itself stays in storage, reachable only by its address; removing it is a dashboard step.

## Consequences

- MIME types are checked against what the browser declares, not the bytes; the bucket only serves the three image
  types, so a mislabelled file is not run as a page.
- Party and regiment pictures are not reportable yet: there is no public page for them.
- Rollback: header of `20261106090000_picture_safety.sql`.
