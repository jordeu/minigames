plugins { id("com.android.application") }
android {
    namespace = "net.jordeu.minigames"
    compileSdk = 36
    defaultConfig {
        applicationId = "net.jordeu.minigames"
        minSdk = 28
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    sourceSets["main"].assets.srcDir("../web/dist")
}
dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.activity:activity:1.10.1")
}
val buildWeb = tasks.register<Exec>("buildWeb") {
    workingDir(rootProject.file("web"))
    commandLine("npm", "run", "build")
    inputs.dir("../web/src")
    inputs.file("../web/index.html")
    inputs.file("../web/package-lock.json")
    outputs.dir("../web/dist")
}
tasks.named("preBuild") { dependsOn(buildWeb) }
