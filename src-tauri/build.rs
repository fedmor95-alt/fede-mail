fn main() {
  // tauri_build embeds icons/icon.ico as the Windows executable icon but
  // only reruns when tauri.conf.json changes; a new icon alone would be
  // silently ignored and the old one would stay baked into velo.exe.
  println!("cargo:rerun-if-changed=icons/icon.ico");
  println!("cargo:rerun-if-changed=icons/32x32.png");
  println!("cargo:rerun-if-changed=icons/128x128.png");
  println!("cargo:rerun-if-changed=icons/128x128@2x.png");
  tauri_build::build()
}
