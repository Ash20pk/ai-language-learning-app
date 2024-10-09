function parseJSON(str) {
  // Remove any non-printable characters
  str = str.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  
  // Replace single quotes with double quotes
  str = str.replace(/'/g, '"');
  
  // Ensure property names are double-quoted
  str = str.replace(/(\w+):/g, '"$1":');
  
  // Remove trailing commas
  str = str.replace(/,\s*([\]}])/g, '$1');

  // Attempt to parse the cleaned string
  try {
    return JSON.parse(str);
  } catch (e) {
    // If parsing fails, try a more lenient approach
    return Function('return ' + str)();
  }
}

export default parseJSON;