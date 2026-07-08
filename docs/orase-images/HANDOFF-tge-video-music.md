# Handoff — swap TGE hero-video soundtrack to Mozart (K.467 Andante)

**For:** Claude Code, in the TGE repo. **Goal:** replace the music on the TGE video with the Mozart piece Claudiu asked for, keeping the current one as a revertible backup.

## What Claudiu asked (RO thread, 06/07)
Use **Mozart — Piano Concerto No. 21, K.467, II. Andante** (the "Elvira Madigan") as the TGE video soundtrack. He linked a YouTube performance — **do not use that recording** (see licensing).

## The video
- File: **`apps/landing/public/videos/hero.mp4`** — h264 video + AAC audio, **61s**. This is the TGE hero Claude Code previously scored.
- Rendered by `apps/landing/src/components/sections/video-hero-section.tsx` and `cinematic-hero.tsx` as `<video autoPlay muted loop playsInline>`.
- **IMPORTANT — on the site it plays MUTED.** Browser autoplay requires it, and there's no unmute control. So swapping the audio changes the **file** (and anywhere it's played with sound — direct WhatsApp/social share, or a future sound-on toggle), but makes **no audible difference to the live site as-is**. If audible on-site music is actually the goal, that's a separate task (add a mute/unmute toggle) and a UX decision for Vlad — flag it, don't silently build it.

## The track — licensing matters (same trap as the tourism images)
- Mozart's *composition* is public domain; the *YouTube recording is copyrighted*. Don't rip it.
- Use: **"Mozart: Andante from Piano Concerto No. 21, KV 467" — performed by Markus Staab — CC BY 3.0** (free commercial use, attribution required), 4:21.
  - Musopen: https://musopen.org/music/2635-piano-concerto-no-21-in-c-major-k-467/  (the Andante track, Markus Staab)
  - Direct mirror: https://www.chosic.com/download-audio/25959/
- Required attribution (add to the site credits page / a `CREDITS.md` / the shared-video description):
  `Mozart Piano Concerto no. 21 in C major, K. 467 – II. Andante by Markus Staab — CC BY 3.0`
- The video is 61s, so only the opening ~61s of the Andante (its iconic theme) is used — which is the best part. If Vlad wants the fuller ~6-min reading Claudiu guessed at, other recordings exist but recording-copyright gets murky; this CC-BY one is the clean default.

## Steps (Claude Code, run locally — the video + ffmpeg are on this machine)
1. Download the mp3 from the Chosic/Musopen page above → `mozart-k467-andante-staab.mp3`.
2. **Back up the current video (with its existing music) so Claudiu can revert:**
   `cp apps/landing/public/videos/hero.mp4 apps/landing/videos-backup/hero-original-music.mp4`
   (keep the backup OUTSIDE `public/` so it isn't served/deployed; create the dir if needed and gitignore it or commit it as a clearly-named backup — Vlad's call).
3. Replace the audio, keep the video stream untouched, trim audio to the video length:
   ```
   ffmpeg -i apps/landing/public/videos/hero.mp4 -i mozart-k467-andante-staab.mp3 \
     -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest \
     -af "afade=t=out:st=59:d=2" apps/landing/public/videos/hero.new.mp4
   mv apps/landing/public/videos/hero.new.mp4 apps/landing/public/videos/hero.mp4
   ```
   (`-c:v copy` = no video re-encode, fast + lossless; `-shortest` trims to the 61s video; the `afade` gives a 2s fade-out.)
4. Add the CC-BY attribution line to the credits.
5. Verify: `ffprobe` the result (≈61s, audio present) and play it with sound to confirm the Mozart track.

## Revert
Keep `hero-original-music.mp4`. To roll back if Claudiu changes his mind: copy it back over `apps/landing/public/videos/hero.mp4`.
