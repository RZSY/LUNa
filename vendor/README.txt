This folder needs one file to make the dashboard charts work: chart.umd.min.js
(the Chart.js library, MIT licensed). It isn't included here because it has to
be downloaded once — after that, the whole app runs 100% offline, same as the
local JSON database.

HOW TO ADD IT (takes under a minute, needs internet once):

1. Open this link in any browser (while you have internet):
   https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js

2. Save the page as a file named exactly:
   chart.umd.min.js
   (Ctrl+S / Cmd+S — most browsers show a "Save As" option when viewing raw
   JS; if it opens as plain text instead, select all, copy, and paste into
   a new text file named chart.umd.min.js)

3. Put that file in this "vendor" folder, right next to this README, so the
   path looks like:
   LUNa/vendor/chart.umd.min.js

4. Reload index.html — the charts will now render, and you won't need
   internet again.

If you ever see a small "Chart library not found" note under the dashboard
charts, it means this file is missing or was moved/renamed.
