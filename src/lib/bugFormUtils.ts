import * as z from "zod";

export interface BugFieldConfig {
  enabled: boolean;
  required: boolean;
}

export interface BugFormConfig {
  title: BugFieldConfig;
  description: BugFieldConfig;
  stepsToReproduce: BugFieldConfig;
  expectedResult: BugFieldConfig;
  actualResult: BugFieldConfig;
  severity: BugFieldConfig;
  priority: BugFieldConfig;
  httpStatus: BugFieldConfig;
  endpointId: BugFieldConfig;
  assignedTo: BugFieldConfig;
  screenshots: BugFieldConfig;
}

export const DEFAULT_BUG_FORM_CONFIG: BugFormConfig = {
  title: { enabled: true, required: true },
  description: { enabled: true, required: true },
  stepsToReproduce: { enabled: true, required: true },
  expectedResult: { enabled: true, required: true },
  actualResult: { enabled: true, required: true },
  severity: { enabled: true, required: true },
  priority: { enabled: true, required: true },
  httpStatus: { enabled: true, required: false },
  endpointId: { enabled: true, required: false },
  assignedTo: { enabled: true, required: false },
  screenshots: { enabled: true, required: false },
};

export function generateBugSchema(config: BugFormConfig) {
  const shape: Record<string, any> = {};

  // 1. Title (always enabled, required is configurable)
  if (config.title?.required) {
    shape.title = z.string().min(5, "Title must be at least 5 characters");
  } else {
    shape.title = z.string().optional().or(z.literal(""));
  }

  // 2. Description (always enabled, required is configurable)
  if (config.description?.required) {
    shape.description = z.string().min(10, "Description must be at least 10 characters");
  } else {
    shape.description = z.string().optional().or(z.literal(""));
  }

  // 3. stepsToReproduce
  if (config.stepsToReproduce?.enabled) {
    if (config.stepsToReproduce.required) {
      shape.stepsToReproduce = z.string().min(10, "Steps to reproduce must be at least 10 characters");
    } else {
      shape.stepsToReproduce = z.string().optional().or(z.literal(""));
    }
  } else {
    shape.stepsToReproduce = z.string().optional().nullable().or(z.literal(""));
  }

  // 4. expectedResult
  if (config.expectedResult?.enabled) {
    if (config.expectedResult.required) {
      shape.expectedResult = z.string().min(5, "Expected result must be at least 5 characters");
    } else {
      shape.expectedResult = z.string().optional().or(z.literal(""));
    }
  } else {
    shape.expectedResult = z.string().optional().nullable().or(z.literal(""));
  }

  // 5. actualResult
  if (config.actualResult?.enabled) {
    if (config.actualResult.required) {
      shape.actualResult = z.string().min(5, "Actual result must be at least 5 characters");
    } else {
      shape.actualResult = z.string().optional().or(z.literal(""));
    }
  } else {
    shape.actualResult = z.string().optional().nullable().or(z.literal(""));
  }

  // 6. severity
  if (config.severity?.enabled) {
    if (config.severity.required) {
      shape.severity = z.enum(["critical", "major", "minor", "low"], {
        message: "Severity level is required",
      });
    } else {
      shape.severity = z.enum(["critical", "major", "minor", "low"]).optional().or(z.literal(""));
    }
  } else {
    shape.severity = z.string().optional().nullable().or(z.literal(""));
  }

  // 7. priority
  if (config.priority?.enabled) {
    if (config.priority.required) {
      shape.priority = z.enum(["high", "medium", "low"], {
        message: "Priority level is required",
      });
    } else {
      shape.priority = z.enum(["high", "medium", "low"]).optional().or(z.literal(""));
    }
  } else {
    shape.priority = z.string().optional().nullable().or(z.literal(""));
  }

  // 8. httpStatus
  if (config.httpStatus?.enabled) {
    if (config.httpStatus.required) {
      shape.httpStatus = z.string().min(1, "HTTP status code is required").refine((val) => {
        const num = parseInt(val);
        return !isNaN(num) && num >= 100 && num <= 599;
      }, "Must be a valid HTTP status code (100-599)");
    } else {
      shape.httpStatus = z.string().optional().or(z.literal("")).refine((val) => {
        if (!val) return true;
        const num = parseInt(val);
        return !isNaN(num) && num >= 100 && num <= 599;
      }, "Must be a valid HTTP status code (100-599)");
    }
  } else {
    shape.httpStatus = z.string().optional().nullable().or(z.literal(""));
  }

  // 9. endpointId
  if (config.endpointId?.enabled) {
    if (config.endpointId.required) {
      shape.endpointId = z.string().min(1, "API endpoint is required");
    } else {
      shape.endpointId = z.string().optional().or(z.literal(""));
    }
  } else {
    shape.endpointId = z.string().optional().nullable().or(z.literal(""));
  }

  // 10. assignedTo
  if (config.assignedTo?.enabled) {
    if (config.assignedTo.required) {
      shape.assignedTo = z.string().min(1, "Assignee is required");
    } else {
      shape.assignedTo = z.string().optional().or(z.literal(""));
    }
  } else {
    shape.assignedTo = z.string().optional().nullable().or(z.literal(""));
  }

  // 11. screenshots
  if (config.screenshots?.enabled) {
    if (config.screenshots.required) {
      shape.screenshots = z.array(z.string()).min(1, "At least one screenshot is required");
    } else {
      shape.screenshots = z.array(z.string()).optional();
    }
  } else {
    shape.screenshots = z.array(z.string()).optional().nullable();
  }

  return z.object(shape);
}
