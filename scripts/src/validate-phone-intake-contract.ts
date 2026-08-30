import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type HttpMethod = "get" | "post";

type PhoneOperation = {
  path: string;
  method: HttpMethod;
  operationId: string;
  responseSchema: string;
  responseIsArray: boolean;
  requestSchema?: string;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const openApiPath = resolve(root, "lib/api-spec/openapi.yaml");
const generatedApiPath = resolve(
  root,
  "lib/api-client-react/src/generated/api.ts",
);
const generatedSchemasPath = resolve(
  root,
  "lib/api-client-react/src/generated/api.schemas.ts",
);
const adminCallsPath = resolve(
  root,
  "artifacts/mechanic-site/src/components/portal/admin-calls.tsx",
);

const openApi = readFileSync(openApiPath, "utf8");
const generatedApi = readFileSync(generatedApiPath, "utf8");
const generatedSchemas = readFileSync(generatedSchemasPath, "utf8");
const adminCalls = readFileSync(adminCallsPath, "utf8");

const expectedOperations: PhoneOperation[] = [
  {
    path: "/phone/intakes/status",
    method: "get",
    operationId: "getPhoneIntakeStatus",
    responseSchema: "PhoneIntakeStatus",
    responseIsArray: false,
  },
  {
    path: "/phone/intakes",
    method: "get",
    operationId: "listPhoneIntakes",
    responseSchema: "PhoneIntake",
    responseIsArray: true,
  },
  {
    path: "/phone/intakes/{id}/process",
    method: "post",
    operationId: "processPhoneIntakeRecording",
    responseSchema: "PhoneIntake",
    responseIsArray: false,
  },
  {
    path: "/phone/intakes/{id}/approve",
    method: "post",
    operationId: "approvePhoneIntake",
    responseSchema: "PhoneIntake",
    responseIsArray: false,
    requestSchema: "PhoneIntakeApproval",
  },
];

function parsePhoneOperations(spec: string): PhoneOperation[] {
  const lines = spec.split(/\r?\n/);
  const operations: PhoneOperation[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const pathMatch = /^  (\/phone\/intakes(?:\/[^:]+)?)\s*:$/.exec(
      lines[lineIndex],
    );
    if (!pathMatch) continue;

    const path = pathMatch[1];
    const pathLines: string[] = [];
    for (
      let nextIndex = lineIndex + 1;
      nextIndex < lines.length;
      nextIndex += 1
    ) {
      if (/^  \S/.test(lines[nextIndex])) break;
      pathLines.push(lines[nextIndex]);
    }

    for (
      let pathLineIndex = 0;
      pathLineIndex < pathLines.length;
      pathLineIndex += 1
    ) {
      const methodMatch = /^    (get|post):\s*$/.exec(pathLines[pathLineIndex]);
      if (!methodMatch) continue;

      const methodLines: string[] = [];
      for (
        let methodLineIndex = pathLineIndex + 1;
        methodLineIndex < pathLines.length;
        methodLineIndex += 1
      ) {
        if (/^    (get|post):\s*$/.test(pathLines[methodLineIndex])) break;
        methodLines.push(pathLines[methodLineIndex]);
      }

      const methodSpec = methodLines.join("\n");
      const operationIdMatch = /^      operationId:\s*(\S+)\s*$/m.exec(
        methodSpec,
      );
      assert.ok(
        operationIdMatch,
        `${methodMatch[1].toUpperCase()} ${path} needs an operationId`,
      );

      const responseStart = methodSpec.indexOf("      responses:");
      assert.ok(
        responseStart >= 0,
        `${operationIdMatch[1]} needs a response schema`,
      );
      const responseSpec = methodSpec.slice(responseStart);
      const responseSchemaMatch =
        /\$ref: "#\/components\/schemas\/([^"]+)"/.exec(responseSpec);
      assert.ok(
        responseSchemaMatch,
        `${operationIdMatch[1]} needs a referenced response schema`,
      );

      const requestBodyStart = methodSpec.indexOf("      requestBody:");
      const requestSpec =
        requestBodyStart >= 0
          ? methodSpec.slice(requestBodyStart, responseStart)
          : "";
      const requestSchemaMatch =
        /\$ref: "#\/components\/schemas\/([^"]+)"/.exec(requestSpec);

      operations.push({
        path,
        method: methodMatch[1] as HttpMethod,
        operationId: operationIdMatch[1],
        responseSchema: responseSchemaMatch[1],
        responseIsArray: responseSpec.includes("        type: array"),
        ...(requestSchemaMatch ? { requestSchema: requestSchemaMatch[1] } : {}),
      });
    }

    lineIndex += pathLines.length;
  }

  return operations;
}

function pascalCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function assertSourceIncludes(
  source: string,
  expected: string,
  context: string,
): void {
  assert.ok(source.includes(expected), `${context} is missing "${expected}"`);
}

function getGeneratedExportBlock(source: string, declaration: string): string {
  const start = source.indexOf(declaration);
  assert.ok(start >= 0, `Generated client is missing "${declaration}"`);
  const nextExport = source.indexOf("\nexport ", start + declaration.length);
  return source.slice(start, nextExport >= 0 ? nextExport : undefined);
}

function getGeneratedOperationBlock(operationId: string): string {
  const declaration = `export const ${operationId} =`;
  const start = generatedApi.indexOf(declaration);
  assert.ok(start >= 0, `Generated client is missing "${declaration}"`);

  const nextUrlHelper = /\nexport const get[A-Za-z0-9]+Url\s*=/.exec(
    generatedApi.slice(start + declaration.length),
  );
  return generatedApi.slice(
    start,
    nextUrlHelper
      ? start + declaration.length + nextUrlHelper.index
      : undefined,
  );
}

function toGeneratedUrl(path: string): string {
  return `/api${path.replace(/\{([^}]+)\}/g, "${$1}")}`;
}

function assertGeneratedOperation(operation: PhoneOperation): void {
  const generatedName = pascalCase(operation.operationId);
  const queryOrMutation = operation.method === "get" ? "Query" : "Mutation";
  const responseType = `${operation.responseSchema}${operation.responseIsArray ? "[]" : ""}`;

  assertSourceIncludes(
    generatedApi,
    `export const ${operation.operationId} =`,
    `${operation.operationId} client function`,
  );
  assertSourceIncludes(
    generatedApi,
    `export const get${generatedName}Url =`,
    `${operation.operationId} URL helper`,
  );
  assertSourceIncludes(
    generatedApi,
    `export const get${generatedName}${queryOrMutation}Options =`,
    `${operation.operationId} React Query options`,
  );
  assert.match(
    generatedApi,
    new RegExp(`export (?:const|function) use${generatedName}`),
    `${operation.operationId} React hook`,
  );

  const urlHelperSource = getGeneratedExportBlock(
    generatedApi,
    `export const get${generatedName}Url =`,
  );
  assertSourceIncludes(
    urlHelperSource,
    `return \`${toGeneratedUrl(operation.path)}\``,
    `${operation.operationId} URL path`,
  );
  const operationSource = getGeneratedOperationBlock(operation.operationId);
  assert.match(
    operationSource,
    new RegExp(`method: '${operation.method.toUpperCase()}'`),
    `${operation.operationId} HTTP method`,
  );
  assert.match(
    operationSource,
    new RegExp(`Promise<${responseType.replace("[]", "\\[\\]")}>`),
    `${operation.operationId} response type`,
  );
  if (operation.requestSchema) {
    assertSourceIncludes(
      operationSource,
      `BodyType<${operation.requestSchema}>`,
      `${operation.operationId} request payload`,
    );
  }
}

const actualOperations = parsePhoneOperations(openApi);
assert.deepEqual(
  actualOperations,
  expectedOperations,
  "The phone-intake OpenAPI operations changed; update this regression check with the contract and generated client together.",
);

for (const operation of expectedOperations) {
  assertGeneratedOperation(operation);
}

for (const schema of new Set([
  ...expectedOperations.map((operation) => operation.responseSchema),
  ...expectedOperations.flatMap((operation) => operation.requestSchema ?? []),
])) {
  assertSourceIncludes(
    generatedSchemas,
    `export interface ${schema} {`,
    `${schema} generated schema`,
  );
}

const adminHooks = [
  "useGetPhoneIntakeStatus",
  "useListPhoneIntakes",
  "useProcessPhoneIntakeRecording",
  "useApprovePhoneIntake",
];
for (const hook of adminHooks) {
  assert.match(
    adminCalls,
    new RegExp(`${hook}\\(\\)`),
    `dispatcher phone-review client boundary invokes ${hook}`,
  );
}

assert.match(
  adminCalls,
  /processRecording\.mutate\(\s*\{\s*id\s*\}/,
  "dispatcher transcription flow must send the selected intake id",
);
assert.match(
  adminCalls,
  /approveIntake\.mutate\(\s*\{\s*id:\s*intake\.id,\s*data:\s*\{/,
  "dispatcher approval flow must send the reviewed intake id and approval data",
);
assertSourceIncludes(
  adminCalls,
  "getListPhoneIntakesQueryKey()",
  "dispatcher queue refresh after transcription or failure",
);
assertSourceIncludes(
  adminCalls,
  "getGetPhoneIntakeStatusQueryKey()",
  "dispatcher phone-line status refresh",
);

console.log(
  `Phone-intake contract check passed (${expectedOperations.length} OpenAPI operations and dispatcher review boundary).`,
);
