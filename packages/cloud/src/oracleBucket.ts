import * as ociBucket from "oci-objectstorage";
import * as ociAuth from "oci-common";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { finished } from "node:stream/promises";
import extendsFS from "@sirherobrine23/extends";
import chokidar from "chokidar";
import stream from "node:stream";
import path from "node:path";
import { http } from "@sirherobrine23/http";

export type oracleRegions = "af-johannesburg-1"|"ap-chuncheon-1"|"ap-hyderabad-1"|"ap-melbourne-1"|"ap-mumbai-1"|"ap-osaka-1"|"ap-seoul-1"|"ap-singapore-1"|"ap-sydney-1"|"ap-tokyo-1"|"ca-montreal-1"|"ca-toronto-1"|"eu-amsterdam-1"|"eu-frankfurt-1"|"eu-madrid-1"|"eu-marseille-1"|"eu-milan-1"|"eu-paris-1"|"eu-stockholm-1"|"eu-zurich-1"|"il-jerusalem-1"|"me-abudhabi-1"|"me-jeddah-1"|"mx-queretaro-1"|"sa-santiago-1"|"sa-saopaulo-1"|"sa-vinhedo-1"|"uk-cardiff-1"|"uk-london-1"|"us-ashburn-1"|"us-chicago-1"|"us-phoenix-1"|"us-sanjose-1";
export type oracleOptions = {
  /** Bucket/Account region */
  region: oracleRegions;

  /**
   * Bucket namespaces
   *
   * from OCI Web interface url: `https://cloud.oracle.com/object-storage/buckets/<namespace>/<name>/objects`
  */
  namespace: string;

  /**
   * Bucket name
   *
   * from OCI Web interface url: `https://cloud.oracle.com/object-storage/buckets/<namespace>/<name>/objects`
   */
  name: string;

  /**
   * Set user auth with Object or set array with file path in fist elementen and second set profile name necessary case.
   *
   * deprecated: pre-shared keys has been disabled, in the future we may add.
   *
   * @example ["/home/user/.oci/config", "sirherobrine23"]
   * @example ["/home/user/.oci/config"]
   * @example ["c:\\.oci\\config"]
   * @example {tenancy: "oci", user: "example", fingerprint: "xx:xx:xx:xx:xx:xx:xx:xx:xx:xx", privateKey: "----OCI KEY----"}
   * @example {tenancy: "oci", user: "example", fingerprint: "xx:xx:xx:xx:xx:xx:xx:xx:xx:xx", privateKey: "----OCI KEY----", passphase: "mySuperPassword"}
   */
  auth?: {
    tenancy: string;
    user: string;
    fingerprint: string;
    privateKey: string;
    passphase?: string;
  }|string[];
}

function getRegion(region: oracleRegions) {
  if (region === "uk-london-1") return ociAuth.Region.UK_LONDON_1;
  else if (region === "uk-cardiff-1") return ociAuth.Region.UK_CARDIFF_1;
  else if (region === "sa-santiago-1") return ociAuth.Region.SA_SANTIAGO_1;
  else if (region === "sa-saopaulo-1") return ociAuth.Region.SA_SAOPAULO_1;
  else if (region === "sa-vinhedo-1") return ociAuth.Region.SA_VINHEDO_1;
  else if (region === "mx-queretaro-1") return ociAuth.Region.MX_QUERETARO_1;
  else if (region === "me-jeddah-1") return ociAuth.Region.ME_JEDDAH_1;
  else if (region === "me-abudhabi-1") return ociAuth.Region.ME_ABUDHABI_1;
  else if (region === "il-jerusalem-1") return ociAuth.Region.IL_JERUSALEM_1;
  else if (region === "eu-zurich-1") return ociAuth.Region.EU_ZURICH_1;
  else if (region === "eu-stockholm-1") return ociAuth.Region.EU_STOCKHOLM_1;
  else if (region === "eu-paris-1") return ociAuth.Region.EU_PARIS_1;
  else if (region === "eu-milan-1") return ociAuth.Region.EU_MILAN_1;
  else if (region === "eu-marseille-1") return ociAuth.Region.EU_MARSEILLE_1;
  else if (region === "eu-madrid-1") return ociAuth.Region.EU_MADRID_1;
  else if (region === "eu-frankfurt-1") return ociAuth.Region.EU_FRANKFURT_1;
  else if (region === "eu-amsterdam-1") return ociAuth.Region.EU_AMSTERDAM_1;
  else if (region === "ca-toronto-1") return ociAuth.Region.CA_TORONTO_1;
  else if (region === "ca-montreal-1") return ociAuth.Region.CA_MONTREAL_1;
  else if (region === "ap-tokyo-1") return ociAuth.Region.AP_TOKYO_1;
  else if (region === "ap-sydney-1") return ociAuth.Region.AP_SYDNEY_1;
  else if (region === "ap-singapore-1") return ociAuth.Region.AP_SINGAPORE_1;
  else if (region === "ap-seoul-1") return ociAuth.Region.AP_SEOUL_1;
  else if (region === "ap-osaka-1") return ociAuth.Region.AP_OSAKA_1;
  else if (region === "ap-mumbai-1") return ociAuth.Region.AP_MUMBAI_1;
  else if (region === "ap-melbourne-1") return ociAuth.Region.AP_MELBOURNE_1;
  else if (region === "ap-hyderabad-1") return ociAuth.Region.AP_HYDERABAD_1;
  else if (region === "ap-chuncheon-1") return ociAuth.Region.AP_CHUNCHEON_1;
  else if (region === "af-johannesburg-1") return ociAuth.Region.AF_JOHANNESBURG_1;
  else if (region === "us-sanjose-1") return ociAuth.Region.US_SANJOSE_1;
  else if (region === "us-phoenix-1") return ociAuth.Region.US_PHOENIX_1;
  else if (region === "us-chicago-1") return ociAuth.Region.US_CHICAGO_1;
  else if (region === "us-ashburn-1") return ociAuth.Region.US_ASHBURN_1;
  else throw new Error("Invalid Oracle Cloud region");
}

export type oracleFileListObject = {
  name: string,
  size: number,
  etag: string,
  storageTier: "Standard"|"InfrequentAccess"|"Archive",
  md5: string,
  getFile: () => Promise<stream.Readable>,
  Dates: {
    Created: Date,
    Modified: Date
  },
};

export type oracleBucket = {
  listFiles(folderPath?: string): Promise<oracleFileListObject[]>,
  deleteFile(pathLocation: string): Promise<void>,
  uploadFile(fileName: string, storageTier?: "Standard"|"InfrequentAccess"|"Archive"): stream.Writable,
  getFileStream(pathLocation: string): Promise<stream.Readable>,
  updateTier?(filePath: string, storageTier: "Standard"|"InfrequentAccess"|"Archive"): Promise<void>,
  watch?(filePath: string, options?: {downloadFist?: boolean, remoteFolder?: string}): Promise<chokidar.FSWatcher>,
};

/**
 * Create object with functions to manage files in Oracle cloud bucket
 */
export async function oracleBucket(config: oracleOptions) {
  const partialFunctions: Partial<oracleBucket> = {};
  const client = new ociBucket.ObjectStorageClient({
    authenticationDetailsProvider: (Array.isArray(config.auth ||= [])) ? new ociAuth.SessionAuthDetailProvider((config.auth||[])[0], (config.auth||[])[1]) : new ociAuth.SimpleAuthenticationDetailsProvider(
      config.auth.tenancy,
      config.auth.user,
      config.auth.fingerprint,
      config.auth.privateKey,
      config.auth.passphase||null,
      getRegion(config.region)
    )
  });

  partialFunctions.uploadFile = function uploadFile(fileName, storageTier) {
    return new class WriteOCI extends stream.PassThrough {
      constructor() {
        super();
        client.putObject({
          namespaceName: config.namespace,
          bucketName: config.name,
          objectName: fileName,
          putObjectBody: stream.Readable.from(this),
          storageTier: storageTier === "Archive" ? ociBucket.models.StorageTier.Archive : storageTier === "InfrequentAccess" ? ociBucket.models.StorageTier.InfrequentAccess : storageTier === "Standard" ? ociBucket.models.StorageTier.Standard : undefined,
        }).then(() => {}, err => this.emit("error", err));
      }
    }
  }

  partialFunctions.deleteFile = async function deleteFile(pathLocation: string) {
    await client.deleteObject({
      namespaceName: config.namespace,
      bucketName: config.name,
      objectName: pathLocation
    });
  }

  partialFunctions.listFiles = async function listFiles(folder?: string) {
    const objects: oracleFileListObject[] = [];
    let start: any;
    while (true) {
      const { listObjects } = await client.listObjects({
        namespaceName: config.namespace,
        bucketName: config.name,
        fields: "name,size,etag,timeCreated,md5,timeModified,storageTier,archivalState" as any,
        prefix: folder,
        startAfter: start,
      });
      listObjects.objects.forEach(item => objects.push({
        name: item.name,
        size: item.size,
        etag: item.etag,
        storageTier: item.storageTier as any,
        md5: item.md5,
        getFile: () => partialFunctions!.getFileStream(item.name),
        Dates: {
          Created: new Date(item.timeCreated),
          Modified: new Date(item.timeModified)
        }
      }))
      if (!(start = listObjects.nextStartWith)) break;
    }

    return objects;
  }

  partialFunctions.getFileStream = async function getFileStream(pathLocation: string) {
    const { value } = await client.getObject({namespaceName: config.namespace, bucketName: config.name, objectName: pathLocation});
    if (!value) throw new Error("No file found");
    else if (value instanceof stream.Readable) return value;
    else return stream.Readable.fromWeb(value as any);
  }

  partialFunctions.watch = async function(folderPath, options) {
    if (!options) options = {};
    if (!folderPath) throw new TypeError("Folder path is required");
    else if (!(await extendsFS.exists(folderPath))) throw new Error("Folder path is not exists");
    else if (!(await extendsFS.isDirectory(folderPath))) throw new Error("Folder path is not a directory");
    if (options.downloadFist) {
      let { remoteFolder = "" } = options;
      const filesList = (await partialFunctions!.listFiles(remoteFolder)).map(d => d.name);
      const localList = (await extendsFS.readdir(folderPath)).map(file => path.posix.resolve("/", path.relative(folderPath, file)));
      for (const local of localList) if (!filesList.includes(local)) await fs.unlink(path.posix.resolve(folderPath, local));
      for await (const remote of filesList) await new Promise(async (done, reject) => (await partialFunctions!.getFileStream(remote)).pipe(createWriteStream(path.posix.resolve(folderPath, remote))).on("error", reject).once("done", done));
    }

    return chokidar.watch(folderPath, {
      ignoreInitial: true,
      atomic: true,
    }).on("add", async (filePath) => {
      await finished(createReadStream(filePath).pipe(partialFunctions!.uploadFile(path.posix.resolve("/", path.relative(folderPath, filePath)))))
    }).on("change", async (filePath) => {
      await finished(createReadStream(filePath).pipe(partialFunctions!.uploadFile(path.posix.resolve("/", path.relative(folderPath, filePath)))))
    }).on("unlink", async (filePath) => {
      await partialFunctions!.deleteFile(path.posix.resolve("/", path.relative(folderPath, filePath)));
    }).on("unlinkDir", async (filePath) => {
      const filesList = (await partialFunctions!.listFiles(path.posix.resolve("/", path.relative(folderPath, filePath)))).map(d => d.name);
      for (const remote of filesList) await partialFunctions!.deleteFile(remote);
    });
  }

  return partialFunctions as oracleBucket;
}

export function oracleBucketPreAuth(region: oracleRegions, namespace: string, name: string, preAuthKey: string) {
  getRegion(region);
  const funs = {
    getFile(filename: string) {
      return http.streamRoot(new URL(path.posix.join("/p", preAuthKey, "n", namespace, "b", name, "o", encodeURIComponent(filename)), `https://objectstorage.${region}.oraclecloud.com`), {
        disableHTTP2: true
      });
    },
    uploadFile(filename: string, storageTier?: oracleFileListObject["storageTier"]): stream.Writable {
      return new class writeFile extends stream.PassThrough {
        constructor() {
          super();
          http.bufferRequest(new URL(path.posix.join("/p", preAuthKey, "n", namespace, "b", name, "o", encodeURIComponent(filename)), `https://objectstorage.${region}.oraclecloud.com`), {
            method: "PUT",
            body: stream.Readable.from(this),
            disableHTTP2: true,
            headers: {
              ...(!!storageTier ? {
                "storage-tier": storageTier,
              } : {}),
              // "Content-Type": "application/x-directory",
              // "opc-meta-virtual-folder-directory-object": "true",
              "Content-Type": "application/octet-stream",
            }
          });
        }
      }
    },
    async listFiles(folder: string = "") {
      const data: oracleFileListObject[] = [];
      let startAfter: string;
      while (true) {
        const response = await http.jsonRequest<{nextStartWith?: string, objects: ociBucket.models.ObjectSummary[]}>(new URL(path.posix.join("/p", preAuthKey, "n", namespace, "b", name, "o"), `https://objectstorage.${region}.oraclecloud.com`), {
          method: "GET",
          query: {
            limit: 1000,
            fields: "name,size,etag,timeCreated,md5,timeModified,storageTier,archivalState",
            prefix: folder ?? "",
            startAfter: startAfter ?? "",
          }
        });
        response.body.objects.forEach(item => data.push({
          name: item.name,
          size: item.size,
          etag: item.etag,
          storageTier: item.storageTier as any,
          md5: item.md5,
          getFile: async () => funs.getFile(item.name),
          Dates: {
            Created: new Date(item.timeCreated),
            Modified: new Date(item.timeModified)
          }
        }));
        if (!(startAfter = response.body.nextStartWith)) break;
      }
      return data;
    }
  };
  return funs;
}