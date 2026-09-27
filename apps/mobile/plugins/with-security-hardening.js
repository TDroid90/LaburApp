const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

const RELEASE_GUARD = `def isEasBuild = System.getenv("EAS_BUILD") == "true"
def localReleaseRequested = gradle.startParameter.taskNames.any { taskName ->
    def normalized = taskName.toLowerCase()
    normalized.contains("release") && (normalized.contains("assemble") || normalized.contains("bundle") || normalized.contains("package") || normalized.contains("install"))
}

if (localReleaseRequested && !isEasBuild) {
    throw new GradleException("Las builds release locales están bloqueadas para evitar firmar accidentalmente con credenciales de desarrollo. Usá EAS Build.")
}`;

const LEGACY_BACKUP_RULES = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="database" path="."/>
  <exclude domain="sharedpref" path="SecureStore"/>
</full-backup-content>
`;

const MODERN_BACKUP_RULES = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="database" path="."/>
    <exclude domain="sharedpref" path="SecureStore"/>
  </cloud-backup>
  <device-transfer>
    <exclude domain="database" path="."/>
    <exclude domain="sharedpref" path="SecureStore"/>
  </device-transfer>
</data-extraction-rules>
`;

function withBackupManifest(config) {
  return withAndroidManifest(config, (current) => {
    const application = current.modResults.manifest.application?.[0]?.$;
    if (!application) throw new Error("No se encontró <application> en AndroidManifest.xml.");
    application["android:allowBackup"] = "false";
    application["android:fullBackupContent"] = "@xml/backup_rules";
    application["android:dataExtractionRules"] = "@xml/data_extraction_rules";
    return current;
  });
}

function withBackupResources(config) {
  return withDangerousMod(config, ["android", async (current) => {
    const xmlDirectory = path.join(current.modRequest.platformProjectRoot, "app", "src", "main", "res", "xml");
    await fs.mkdir(xmlDirectory, { recursive: true });
    await fs.writeFile(path.join(xmlDirectory, "backup_rules.xml"), LEGACY_BACKUP_RULES);
    await fs.writeFile(path.join(xmlDirectory, "data_extraction_rules.xml"), MODERN_BACKUP_RULES);
    return current;
  }]);
}

function withLocalReleaseGuard(config) {
  return withAppBuildGradle(config, (current) => {
    if (!current.modResults.contents.includes("def isEasBuild = System.getenv")) {
      current.modResults.contents = current.modResults.contents.replace(
        /def projectRoot = .*$/m,
        (line) => `${line}\n${RELEASE_GUARD}`,
      );
    }

    const releaseBlock = /(release\s*\{[\s\S]*?)(\s+signingConfig signingConfigs\.debug\s*\n)/;
    if (!releaseBlock.test(current.modResults.contents)) {
      throw new Error("No se encontró la firma debug del bloque release para protegerla.");
    }
    current.modResults.contents = current.modResults.contents.replace(
      releaseBlock,
      "$1\n            // EAS Build inyecta la firma de producción; las builds release locales están bloqueadas.\n",
    );
    return current;
  });
}

module.exports = function withSecurityHardening(config) {
  config = withBackupManifest(config);
  config = withBackupResources(config);
  return withLocalReleaseGuard(config);
};
