//The Detonater
//Version: 2.0.0

import * as filepath from "https://deno.land/std/path/mod.ts";
import * as jszip from "https://deno.land/x/jszip/mod.ts";
import * as fs from "https://deno.land/std/fs/mod.ts";
import { createHash } from "https://deno.land/std/hash/mod.ts";

const tempDir = await Deno.makeTempDir({ prefix: "detonater_" });
console.log(tempDir);

console.log("Executing the Detonater.");

if (Deno.args.length >= 2) {
	const targetPath = filepath.resolve(Deno.args.slice(1).join(" "));
	
	if (Deno.args[0] == "file") {
		const compressedJar = await compressJar(targetPath, false);
		await fs.ensureDir(`./detonatedmods/`);
		await Deno.writeFile(`./detonatedmods/${filepath.parse(targetPath).base}`, compressedJar);
    } else if (Deno.args[0] == "folder") {
		for await (const mod of Deno.readDir(targetPath)) {
			if (mod.isFile && mod.name.endsWith(".jar")) {
				console.log(`Optimizing ${mod.name}...`);
				const compressedJar = await compressJar(`${targetPath}/${mod.name}`, false);
				await fs.ensureDir("./detonatedmods");
				await Deno.writeFile(`./detonatedmods/${mod.name}`, compressedJar);
			}
		}
	} else {
		console.error("First argument must be either \"file\" or \"folder\"");
	}
}

async function compressJar(path : string, isJiJ: boolean) : Promise<Uint8Array> {
	const filename = filepath.parse(path).base;
	const hash = createHash("md5");
	hash.update(await Deno.readFile(path));
	const tempJarPath = `${tempDir}/${hash.toString()}`;
	if (!await fs.exists(tempJarPath)) {
		const zip = await jszip.readZip(`${path}`);
		await unzip(zip, tempJarPath);
		await searchMod(tempJarPath);
	} else {
		console.log(`${filename} was already compressed! Reusing it.`);
	}
	const newZip = await rezip(tempJarPath);
	const optimizedZip = await newZip.generateAsync({
		compression: isJiJ ? "STORE" : "DEFLATE",
		compressionOptions: isJiJ ? null : { level: 9 },
		mimeType: "application/java-archive",
		type: "uint8array"
	});
	console.log(`The compression of ${filename} is done!`);
	return optimizedZip;
}

async function unzip(zip : jszip.JSZip, path : string) {
	console.log(`Extracting to ${path}`);
	for (const file of zip) {
		const dir = file.name.split("/");
		dir.pop();
		let fullPath = `${path}/${file.name}`;
		//Prevent an error when the path gets too big
		if (Deno.build.os == "windows" && fullPath.length >= 260) {
			console.log("Found a huge path! Patching it...");
			fullPath = `\\\\?\\${fullPath}`;
			fullPath = fullPath.replaceAll("/", "\\");
		}
		if (file.dir) {
			await Deno.mkdir(`${fullPath}`, { recursive: true });
		} else {
			await fs.ensureDir(`${path}/${dir.join("/")}`);
			await Deno.writeFile(`${fullPath}`, await file.async("uint8array"));
		}
	}
}

async function rezip(path : string) : Promise<jszip.JSZip> {
	console.log(`Repackaging to ${path}`);
	const repackagedZip = new jszip.JSZip();
	for await (const file of fs.walk(path)) {
		let filePath = file.path;
		filePath = filePath.replaceAll("\\", "/");
		path = path.replaceAll("\\", "/");
		if (file.isDirectory) {
			if (filePath != path) {
				repackagedZip.addFile(filePath.replace(path, "").substring(1), "", { dir: true });
			}
		} else {
			let windowsFilePath = filePath;
			//Prevent an error when the path gets too big
			if (Deno.build.os == "windows" && windowsFilePath.length >= 260) {
				console.log("Found a huge path! Patching it...");
				windowsFilePath = `\\\\?\\${windowsFilePath}`;
				windowsFilePath = windowsFilePath.replaceAll("/", "\\");
			}
			const repackagedFile = await Deno.readFile(windowsFilePath);
			repackagedZip.addFile(
				filePath.replaceAll("\\", "/").replace(path, "").substring(1),
				repackagedFile,
				{ createFolders: true }
			);
		}
	}
	return repackagedZip;
}

async function searchMod(dir : string) {
	for await (const file of fs.walk(dir, { exts: ["json", "mcmeta", "png", "jar"] })) {
		if (file.name.endsWith(".json")) {
			console.log(`Found the JSON ${file.name}, normalizing it...`);
			await normalizeJson(file.path);
		} else if (file.name.endsWith(".mcmeta")) {
			console.log(`Found the mcmeta ${file.name}, normalizing it...`);
			await normalizeJson(file.path);
		} else if (file.name.endsWith(".png")) {
			console.log(`Found the PNG ${file.name}, optimizing it with oxipng...`);
			await optimizePng(file.path);
		} else if (file.name.endsWith(".jar")) {
			console.log(`Found the JiJ ${file.name}, compressing it...`);
			const compressedJar = await compressJar(file.path, true);
			await Deno.writeFile(file.path, compressedJar);
		}
	}
}

async function normalizeJson(path : string) {
	try {
		const json = await JSON.parse(await Deno.readTextFile(path));
		await Deno.writeTextFile(path, JSON.stringify(json, null, 2));	
	} catch (error) {
		console.error("The JSON file is malformed! It won't be minified.");
		console.error(error);
	}
}

async function optimizePng(dir : string) {
	await Deno.run({
		cmd: ["oxipng", `--opt`, `max`, `-D`, `--strip`, `safe`, `--alpha`, `${dir}`],
		stdout: "piped"
	}).output();
}
