//The Detonator
//Version: 1.0.0

import * as filepath from "https://deno.land/std/path/mod.ts";
import * as jszip from "https://deno.land/x/jszip/mod.ts";
import * as fs from "https://deno.land/std/fs/mod.ts";
import { createHash } from "https://deno.land/std/hash/mod.ts";

const tempDir = await Deno.makeTempDir({ prefix: "detonator_" });
console.log(tempDir);

console.log("Executing the Detonator.");

if (Deno.args.length >= 2) {
	const targetPath = filepath.resolve(Deno.args.slice(1).join(" "));
	
    if (Deno.args[0] == "file") {
		const compressedJar = await compressJar(targetPath);
		await fs.ensureDir(`./detonatedMods/`);
		await Deno.writeFile(`./detonatedMods/${filepath.parse(targetPath).base}`, compressedJar);
    } else if (Deno.args[0] == "folder") {
		for await (const mod of Deno.readDir(targetPath)) {
			if (mod.isFile && mod.name.endsWith(".jar")) {
				console.log(`Optimizing ${mod.name}...`);
				const compressedJar = await compressJar(`${targetPath}/${mod.name}`);
				await fs.ensureDir("./detonatedMods");
				await Deno.writeFile(`./detonatedMods/${mod.name}`, compressedJar);
			}
		}
    } else {
		console.error("First argument must be either \"file\" or \"folder\"");
	}
}

async function compressJar(path : string) : Promise<Uint8Array> {
	const filename = filepath.parse(path).base;
	const hash = createHash("md5");
	hash.update(await Deno.readFile(path));
	const tempJarPath = `${tempDir}/${hash.toString()}`
	if (!await fs.exists(tempJarPath)) {
		const zip = await jszip.readZip(`${path}`);
		await betterUnzip(zip, tempJarPath);
		await searchMod(tempJarPath);
	} else {
		console.log(`${filename} was already compressed! Reusing it.`);
	}
	const newZip = await jszip.zipDir(tempJarPath);
	const optimizedZip = await newZip.generateAsync({compression: "DEFLATE", compressionOptions: { level: 9 }, type: "uint8array"});
	console.log(`The compression of ${filename} is done!`);
	return optimizedZip;
}

async function betterUnzip(zip : jszip.JSZip, path : string) {
	console.log(`Extracting to ${path}`);
	for (const file of zip) {
		const dir = file.name.split("/");
		dir.pop();
		if (file.dir) {
			await Deno.mkdir(`${path}/${file.name}`, { recursive: true });
		} else {
			await fs.ensureDir(`${path}/${dir.join("/")}`);
			await Deno.writeFile(`${path}/${file.name}`, await file.async("uint8array"));
		}
	}
}

async function searchMod(dir : string) {
	for await (const file of Deno.readDir(dir)) {
		if (file.name.endsWith(".json")) {
			console.log(`Found the JSON ${file.name}, minifying it...`);
			await minifyJson(`${dir}/${file.name}`);
		} else if (file.name.endsWith(".mcmeta")) {
			console.log(`Found the mcmeta ${file.name}, minifying it...`);
			await minifyJson(`${dir}/${file.name}`);
		} else if (file.name.endsWith(".png")) {
			console.log(`Found the PNG ${file.name}, optimizing it with oxipng...`);
			await optimizePng(`${dir}/${file.name}`);
		} else if (file.name.endsWith(".jar")) {
			console.log(`Found the JiJ ${file.name}, compressing it...`);
			const compressedJar = await compressJar(`${dir}/${file.name}`);
			await Deno.writeFile(`${dir}/${file.name}`, compressedJar);
		}  else if (file.isDirectory) {
			await searchMod(`${dir}/${file.name}`);
		}
	}
}

async function minifyJson(path : string) {
	try {
		const json = await fs.readJson(path);
		await fs.writeJson(path, json, {spaces: 0});	
	} catch (error) {
		console.error(error);
	}
}

async function optimizePng(dir : string) {
	await Deno.run({
		cmd: ["oxipng", `--opt`, `max`, `--alpha`, `${dir}`],
		stdout: "piped"
	}).output();
}
