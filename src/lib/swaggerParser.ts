export interface ParsedEndpoint {
  tag: string;
  method: string; // 'GET' | 'POST' etc.
  path: string;
  summary: string;
  description: string;
  swaggerLink: string;
}

export function getSwaggerUiUrl(swaggerUrl: string): string {
  if (!swaggerUrl) return "";
  try {
    const url = new URL(swaggerUrl);
    const existingHash = url.hash;
    let pathname = url.pathname.toLowerCase();
    
    if (pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    
    const swaggerMatch = pathname.match(/^(.*\/swagger)(?:\/|$)/i);
    if (swaggerMatch) {
      url.pathname = swaggerMatch[1] + "/index.html";
      url.search = "";
      url.hash = existingHash;
      return url.toString();
    } else if (pathname.match(/\.[a-z0-9]+$/i)) {
      // If it ends with a file extension, replace the filename with index.html
      url.pathname = url.pathname.replace(/\/[^\/]+\.[a-z0-9]+$/i, "/index.html");
      url.search = "";
      url.hash = existingHash;
      return url.toString();
    }
  } catch (e) {
    // Fallback if URL parsing fails
  }
  return swaggerUrl;
}

export function parseSwagger(spec: any, swaggerUrl: string): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];

  if (!spec || typeof spec !== "object") {
    return [];
  }

  const paths = spec.paths || {};

  const uiBaseUrl = getSwaggerUiUrl(swaggerUrl);

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
