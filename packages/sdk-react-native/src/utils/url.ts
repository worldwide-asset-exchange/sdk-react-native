export const extractURL = (
  url: string,
  name: string = 'token',
  isClean: boolean = true
): string => {
  // Create a regular expression that dynamically matches the specified token name
  const tokenRegex = new RegExp(`${name}=([^&]+)`);

  // Match the token in the URL using the dynamically generated regex
  const tokenMatch = url.match(tokenRegex);

  if (tokenMatch && tokenMatch.length && tokenMatch.length > 1) {
    // Extract and clean the token
    const token = tokenMatch[1];
    const cleanedToken = isClean ? token?.replace(/[^\w\s-]/g, '') : token; // Use a more comprehensive character set for safer cleaning
    return cleanedToken || '';
  }

  // Return an empty string if no token is found
  return '';
};
