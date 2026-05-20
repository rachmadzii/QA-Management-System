export interface ParsedEndpoint {
  tag: string;
  method: string; // 'GET' | 'POST' etc.
  path: string;
  summary: string;
  description: string;
  swaggerLink: string;
}

export function parseSwagger(spec: any, swaggerUrl: string): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];

  if (!spec || typeof spec !== "object") {
    return [];
  }

  const paths = spec.paths || {};

  // Clean the swagger URL to point to the index page or use as a base for hashes
  let uiBaseUrl = swaggerUrl;
  // If the url ends with json or yaml, try to get the directory, but keep it simple:
  // if index.html is not in it, we can still append hash.
  if (uiBaseUrl.endsWith("/swagger.json") || uiBaseUrl.endsWith("/openapi.json")) {
    uiBaseUrl = uiBaseUrl.replace(/\/(swagger|openapi)\.json$/, "/index.html");
  } else if (uiBaseUrl.endsWith(".json") || uiBaseUrl.endsWith(".yaml") || uiBaseUrl.endsWith(".yml")) {
    // Fallback or leave as is
  }

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    for (const [methodKey, methodItem] of Object.entries(pathItem)) {
      // standard HTTP methods
      const validMethods = ["get", "post", "put", "delete", "patch", "options", "head"];
      if (!validMethods.includes(methodKey.toLowerCase())) continue;

      const op = methodItem as any;
      
      // Extract Tag
      const tags = op.tags || [];
      const tag = tags[0] || "Default";

      // Extract details
      const summary = op.summary || "";
      const description = op.description || "";
      const method = methodKey.toUpperCase();

      // Build Swagger Deep Link
      // Standard deep link format in Swagger UI: #/Tag/operationId
      // If operationId is missing, it uses method_path (with slashes and braces replaced by underscores)
      let operationId = op.operationId;
      if (!operationId) {
        // e.g. /auth/login -> auth_login
        const cleanPath = pathKey
          .replace(/[\{\}]/g, "")
          .replace(/[\/-]/g, "_");
        operationId = `${methodKey.toLowerCase()}${cleanPath}`;
      }

      // Encode the hash components properly
      const cleanTag = encodeURIComponent(tag);
      const cleanOpId = encodeURIComponent(operationId);
      const swaggerLink = `${uiBaseUrl}#/${cleanTag}/${cleanOpId}`;

      endpoints.push({
        tag,
        method,
        path: pathKey,
        summary,
        description,
        swaggerLink,
      });
    }
  }

  return endpoints;
}
