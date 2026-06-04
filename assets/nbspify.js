function nbspify(str) {
  if (!str) return str;
  return str.replace(
    /(^|\s)([aioüzżw]|do|na|po|we|ze|od|ku|za|bo|by|co|go|to|że|już|jak|ale|czy|lub|ani|nie|tak)\s/gi,
    function(_, pre, word) { return pre + word + ' '; }
  );
}
