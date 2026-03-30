(function (global) {
  "use strict";

  function createFileHelpers() {
    let crc32Table = null;

    function buildZipError(code, message, extras) {
      const error = new Error(message);
      error.code = code;
      if (extras && typeof extras === "object") {
        Object.keys(extras).forEach(function (key) {
          error[key] = extras[key];
        });
      }
      return error;
    }

    // Codifica texto UTF-8 em bytes.
    function utf8Encode(text) {
      if (typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(String(text || ""));
      }

      // Fallback para navegadores antigos.
      const encoded = unescape(encodeURIComponent(String(text || "")));
      const bytes = new Uint8Array(encoded.length);
      for (let i = 0; i < encoded.length; i += 1) {
        bytes[i] = encoded.charCodeAt(i);
      }
      return bytes;
    }

    // Decodifica bytes UTF-8 para texto.
    function utf8Decode(bytes) {
      const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
      if (typeof TextDecoder !== "undefined") {
        return new TextDecoder("utf-8").decode(source);
      }

      // Fallback para navegadores antigos.
      let binary = "";
      for (let i = 0; i < source.length; i += 1) {
        binary += String.fromCharCode(source[i]);
      }
      try {
        return decodeURIComponent(escape(binary));
      } catch (_error) {
        return binary;
      }
    }

    // Converte Blob para Data URL (base64).
    function blobToDataUrl(blob) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function (event) {
          resolve(String(event.target.result || ""));
        };
        reader.onerror = function () {
          reject(reader.error || new Error("Falha ao ler blob."));
        };
        reader.readAsDataURL(blob);
      });
    }

    // Extrai MIME de um Data URL.
    function dataUrlMimeType(dataUrl) {
      const text = String(dataUrl || "");
      const match = text.match(/^data:([^;,]+)(?:;base64)?,/i);
      return match ? match[1].toLowerCase() : "";
    }

    // Converte Data URL em bytes + MIME.
    function dataUrlToBytes(dataUrl) {
      const text = String(dataUrl || "");
      if (!/^data:/i.test(text)) return null;

      const commaIndex = text.indexOf(",");
      if (commaIndex < 0) return null;

      const header = text.slice(5, commaIndex);
      const payload = text.slice(commaIndex + 1);
      const headerParts = header.split(";");
      const mime = String(headerParts.shift() || "application/octet-stream").toLowerCase();
      const isBase64 = headerParts.some(function (part) {
        return String(part || "").toLowerCase() === "base64";
      });

      if (isBase64) {
        const binary = global.atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return { mime: mime, bytes: bytes };
      }

      const decoded = decodeURIComponent(payload);
      return { mime: mime, bytes: utf8Encode(decoded) };
    }

    // Converte bytes em Data URL com MIME informado.
    function bytesToDataUrl(bytes, mimeType) {
      const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
      const mime = String(mimeType || "application/octet-stream");
      return "data:" + mime + ";base64," + bytesToBase64(source);
    }

    // Converte bytes para base64.
    function bytesToBase64(bytes) {
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      return global.btoa(binary);
    }

    // Converte base64 em bytes.
    function base64ToBytes(base64Value) {
      const binary = global.atob(String(base64Value || ""));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    // Detecta se o app esta rodando dentro do wrapper Android nativo.
    function isAndroidHostAvailable() {
      return !!(
        typeof global !== "undefined" &&
        global.AndroidHost &&
        typeof global.AndroidHost.saveExportFile === "function"
      );
    }

    // Sanitiza extensão para uso em nome de arquivo.
    function cleanAssetExtension(ext) {
      const raw = String(ext || "")
        .toLowerCase()
        .replace(/^\./, "")
        .replace(/[^a-z0-9]/g, "");
      if (!raw) return "";
      if (raw === "jpeg") return "jpg";
      return raw;
    }

    // Mapeia MIME de imagem para extensão preferencial.
    function mimeToExtension(mimeType) {
      const mime = String(mimeType || "").toLowerCase().trim();
      if (!mime) return "";

      const map = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
        "image/bmp": "bmp",
        "image/x-icon": "ico",
        "image/vnd.microsoft.icon": "ico",
        "image/avif": "avif"
      };
      if (map[mime]) return map[mime];

      if (mime.indexOf("image/") === 0) {
        const subtype = mime.split("/")[1].split(";")[0].split("+")[0];
        return cleanAssetExtension(subtype);
      }
      return "";
    }

    // Mapeia extensão de arquivo para MIME de imagem.
    function mimeFromExtension(pathOrExt) {
      const ext = cleanAssetExtension(inferExtensionFromPath(pathOrExt) || pathOrExt);
      const map = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        bmp: "image/bmp",
        ico: "image/x-icon",
        avif: "image/avif"
      };
      return map[ext] || "";
    }

    // Extrai extensão de caminho/URL.
    function inferExtensionFromPath(path) {
      const text = String(path || "").trim();
      if (!text) return "";

      const noQuery = text.split("?")[0].split("#")[0];
      const match = noQuery.match(/\.([a-z0-9]+)$/i);
      return match ? cleanAssetExtension(match[1]) : "";
    }

    // Converte Date para formato DOS usado em cabecalho ZIP.
    function toDosDateTime(date) {
      const d = date instanceof Date ? date : new Date();
      let year = d.getFullYear();
      if (year < 1980) year = 1980;
      if (year > 2107) year = 2107;
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const hour = d.getHours();
      const minute = d.getMinutes();
      const second = Math.floor(d.getSeconds() / 2);

      const dosDate = ((year - 1980) << 9) | (month << 5) | day;
      const dosTime = (hour << 11) | (minute << 5) | second;
      return { dosDate: dosDate, dosTime: dosTime };
    }

    // Calcula CRC32 (obrigatorio no formato ZIP).
    function crc32(bytes) {
      const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
      if (!crc32Table) {
        crc32Table = new Uint32Array(256);
        for (let i = 0; i < 256; i += 1) {
          let c = i;
          for (let k = 0; k < 8; k += 1) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
          }
          crc32Table[i] = c >>> 0;
        }
      }

      let crc = 0xffffffff;
      for (let i = 0; i < source.length; i += 1) {
        crc = crc32Table[(crc ^ source[i]) & 0xff] ^ (crc >>> 8);
      }
      return (crc ^ 0xffffffff) >>> 0;
    }

    // Escreve inteiro little-endian 16 bits.
    function writeUInt16(view, offset, value) {
      view.setUint16(offset, value & 0xffff, true);
    }

    // Escreve inteiro little-endian 32 bits.
    function writeUInt32(view, offset, value) {
      view.setUint32(offset, value >>> 0, true);
    }

    // Le inteiro little-endian 16 bits de Uint8Array.
    function readUInt16(bytes, offset) {
      return bytes[offset] | (bytes[offset + 1] << 8);
    }

    // Le inteiro little-endian 32 bits de Uint8Array.
    function readUInt32(bytes, offset) {
      return (
        (bytes[offset]) |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        ((bytes[offset + 3] << 24) >>> 0)
      ) >>> 0;
    }

    // Normaliza caminho interno do ZIP para evitar formatos inconsistentes.
    function normalizeZipPath(path) {
      const normalized = String(path || "")
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/^\/+/, "")
        .replace(/\/{2,}/g, "/")
        .trim();
      return normalized;
    }

    // Junta varios blocos Uint8Array em um unico buffer.
    function concatBytes(parts, totalLength) {
      const output = new Uint8Array(totalLength);
      let offset = 0;
      parts.forEach(function (part) {
        output.set(part, offset);
        offset += part.length;
      });
      return output;
    }

    // Cria ZIP simples (sem compressao) com caminhos/bytes informados.
    function createZip(entries) {
      const list = Array.isArray(entries) ? entries : [];
      const now = toDosDateTime(new Date());
      const localParts = [];
      const centralParts = [];
      const centralMeta = [];
      let localLength = 0;

      list.forEach(function (entry) {
        const path = normalizeZipPath(entry && entry.path);
        if (!path) return;

        const fileBytes =
          entry.bytes instanceof Uint8Array ? entry.bytes : new Uint8Array(entry.bytes || []);
        const nameBytes = utf8Encode(path);
        const crc = crc32(fileBytes);
        const localOffset = localLength;

        const localHeader = new Uint8Array(30);
        const localView = new DataView(localHeader.buffer);
        writeUInt32(localView, 0, 0x04034b50);
        writeUInt16(localView, 4, 20);
        writeUInt16(localView, 6, 0x0800);
        writeUInt16(localView, 8, 0);
        writeUInt16(localView, 10, now.dosTime);
        writeUInt16(localView, 12, now.dosDate);
        writeUInt32(localView, 14, crc);
        writeUInt32(localView, 18, fileBytes.length);
        writeUInt32(localView, 22, fileBytes.length);
        writeUInt16(localView, 26, nameBytes.length);
        writeUInt16(localView, 28, 0);

        localParts.push(localHeader, nameBytes, fileBytes);
        localLength += localHeader.length + nameBytes.length + fileBytes.length;

        centralMeta.push({
          path: path,
          nameBytes: nameBytes,
          size: fileBytes.length,
          crc: crc,
          localOffset: localOffset
        });
      });

      let centralLength = 0;
      centralMeta.forEach(function (meta) {
        const centralHeader = new Uint8Array(46);
        const centralView = new DataView(centralHeader.buffer);
        writeUInt32(centralView, 0, 0x02014b50);
        writeUInt16(centralView, 4, 20);
        writeUInt16(centralView, 6, 20);
        writeUInt16(centralView, 8, 0x0800);
        writeUInt16(centralView, 10, 0);
        writeUInt16(centralView, 12, now.dosTime);
        writeUInt16(centralView, 14, now.dosDate);
        writeUInt32(centralView, 16, meta.crc);
        writeUInt32(centralView, 20, meta.size);
        writeUInt32(centralView, 24, meta.size);
        writeUInt16(centralView, 28, meta.nameBytes.length);
        writeUInt16(centralView, 30, 0);
        writeUInt16(centralView, 32, 0);
        writeUInt16(centralView, 34, 0);
        writeUInt16(centralView, 36, 0);
        writeUInt32(centralView, 38, 0);
        writeUInt32(centralView, 42, meta.localOffset);

        centralParts.push(centralHeader, meta.nameBytes);
        centralLength += centralHeader.length + meta.nameBytes.length;
      });

      const endHeader = new Uint8Array(22);
      const endView = new DataView(endHeader.buffer);
      writeUInt32(endView, 0, 0x06054b50);
      writeUInt16(endView, 4, 0);
      writeUInt16(endView, 6, 0);
      writeUInt16(endView, 8, centralMeta.length);
      writeUInt16(endView, 10, centralMeta.length);
      writeUInt32(endView, 12, centralLength);
      writeUInt32(endView, 16, localLength);
      writeUInt16(endView, 20, 0);

      const totalLength = localLength + centralLength + endHeader.length;
      return concatBytes(localParts.concat(centralParts, [endHeader]), totalLength);
    }

    function getZipRuntime() {
      const runtime = global && global.fflate;
      return runtime && typeof runtime.unzipSync === "function" ? runtime : null;
    }

    function mapZipRuntimeError(error) {
      const message = String((error && error.message) || "");
      const unsupportedMatch = message.match(/unknown compression type\s+(\d+)/i);
      if ((error && error.code === 14) || unsupportedMatch) {
        const suffix = unsupportedMatch ? " (método " + unsupportedMatch[1] + ")." : ".";
        return buildZipError(
          "zip_unsupported_compression",
          "ZIP usa um método de compressão não suportado pelo importador" + suffix,
          { cause: error }
        );
      }
      return buildZipError("zip_invalid", "ZIP inválido ou corrompido.", { cause: error });
    }

    // Faz parse do ZIP com fallback store-only quando nenhum runtime robusto estiver carregado.
    function parseZipStoredOnly(zipBytes) {
      const bytes = zipBytes instanceof Uint8Array ? zipBytes : new Uint8Array(zipBytes || []);
      if (bytes.length < 22) throw buildZipError("zip_invalid", "ZIP inválido ou corrompido.");

      const minOffset = Math.max(0, bytes.length - 65557);
      let eocdOffset = -1;
      for (let i = bytes.length - 22; i >= minOffset; i -= 1) {
        if (
          bytes[i] === 0x50 &&
          bytes[i + 1] === 0x4b &&
          bytes[i + 2] === 0x05 &&
          bytes[i + 3] === 0x06
        ) {
          eocdOffset = i;
          break;
        }
      }
      if (eocdOffset < 0) throw buildZipError("zip_invalid", "ZIP inválido ou corrompido.");

      const totalEntries = readUInt16(bytes, eocdOffset + 10);
      const centralOffset = readUInt32(bytes, eocdOffset + 16);
      if (centralOffset >= bytes.length) throw buildZipError("zip_invalid", "ZIP inválido ou corrompido.");

      let cursor = centralOffset;
      const entries = [];

      for (let index = 0; index < totalEntries; index += 1) {
        if (cursor + 46 > bytes.length) throw buildZipError("zip_invalid", "ZIP inválido ou corrompido.");
        const signature = readUInt32(bytes, cursor);
        if (signature !== 0x02014b50) throw buildZipError("zip_invalid", "ZIP inválido ou corrompido.");

        const compression = readUInt16(bytes, cursor + 10);
        const compressedSize = readUInt32(bytes, cursor + 20);
        const fileNameLen = readUInt16(bytes, cursor + 28);
        const extraLen = readUInt16(bytes, cursor + 30);
        const commentLen = readUInt16(bytes, cursor + 32);
        const localOffset = readUInt32(bytes, cursor + 42);

        const nameStart = cursor + 46;
        const nameEnd = nameStart + fileNameLen;
        if (nameEnd > bytes.length) throw buildZipError("zip_invalid", "ZIP inválido ou corrompido.");
        const path = normalizeZipPath(utf8Decode(bytes.subarray(nameStart, nameEnd)));

        cursor = nameEnd + extraLen + commentLen;

        if (localOffset + 30 > bytes.length) throw buildZipError("zip_invalid", "ZIP inválido ou corrompido.");
        if (readUInt32(bytes, localOffset) !== 0x04034b50) {
          throw buildZipError("zip_invalid", "ZIP inválido ou corrompido.");
        }

        const localNameLen = readUInt16(bytes, localOffset + 26);
        const localExtraLen = readUInt16(bytes, localOffset + 28);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const dataEnd = dataStart + compressedSize;
        if (dataEnd > bytes.length) throw buildZipError("zip_invalid", "ZIP inválido ou corrompido.");

        if (compression !== 0) {
          throw buildZipError(
            "zip_unsupported_compression",
            "ZIP usa um método de compressão não suportado pelo importador (método " + compression + ").",
            { compressionMethod: compression }
          );
        }

        if (!path || /\/$/.test(path)) continue;

        entries.push({
          path: path,
          bytes: bytes.slice(dataStart, dataEnd)
        });
      }

      return entries;
    }

    function parseZipWithRuntime(zipBytes) {
      const runtime = getZipRuntime();
      if (!runtime) return parseZipStoredOnly(zipBytes);

      try {
        const source = zipBytes instanceof Uint8Array ? zipBytes : new Uint8Array(zipBytes || []);
        const files = runtime.unzipSync(source);
        const entries = [];
        Object.keys(files || {}).forEach(function (rawPath) {
          const path = normalizeZipPath(rawPath);
          if (!path || /\/$/.test(path)) return;
          const fileBytes = files[rawPath] instanceof Uint8Array
            ? files[rawPath]
            : new Uint8Array(files[rawPath] || []);
          entries.push({
            path: path,
            bytes: new Uint8Array(fileBytes)
          });
        });
        return entries;
      } catch (error) {
        throw mapZipRuntimeError(error);
      }
    }

    function parseZip(zipBytes) {
      return parseZipWithRuntime(zipBytes);
    }

    return {
      utf8Encode: utf8Encode,
      utf8Decode: utf8Decode,
      blobToDataUrl: blobToDataUrl,
      dataUrlMimeType: dataUrlMimeType,
      dataUrlToBytes: dataUrlToBytes,
      bytesToDataUrl: bytesToDataUrl,
      bytesToBase64: bytesToBase64,
      base64ToBytes: base64ToBytes,
      isAndroidHostAvailable: isAndroidHostAvailable,
      mimeToExtension: mimeToExtension,
      mimeFromExtension: mimeFromExtension,
      inferExtensionFromPath: inferExtensionFromPath,
      cleanAssetExtension: cleanAssetExtension,
      normalizeZipPath: normalizeZipPath,
      createZip: createZip,
      parseZip: parseZip
    };
  }

  global.AraLearnFileHelpers = {
    createFileHelpers: createFileHelpers
  };
})(window);
