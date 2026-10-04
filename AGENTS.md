# Architecture Rules

- Route uploaded scheme extraction through a dedicated `extract-scheme` Edge Function so AI credentials remain server-side and imported schemes remain local-first.