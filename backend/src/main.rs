use clap::Parser;
use rust_embed::RustEmbed;
use std::{net::SocketAddr, str::FromStr};
use tokio::net::TcpListener;

mod routes;
pub mod db;
pub mod auth;
pub mod database;
pub mod users;

#[derive(RustEmbed)]
#[folder = "../frontend/dist/"]
struct Assets;

#[derive(Parser)]
#[command(name = "Postgre Hub", about = "Postgre Hub — PostgreSQL database manager")]
struct Args {
    #[arg(short, long, default_value = "8080")]
    port: u16,

    #[arg(long, default_value_t = false)]
    dev: bool,
}

#[tokio::main]
async fn main() {
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install ring CryptoProvider");

    let args: Args = Args::parse();
    let app = routes::create_router(args.dev, args.port);
    let addr = SocketAddr::from_str(&format!("0.0.0.0:{}", args.port)).unwrap();

    let mode_label = if args.dev {
        "\x1b[33mDEV\x1b[0m"
    } else {
        "\x1b[32mPROD\x1b[0m"
    };

    println!("");
    println!("  \x1b[1mPostgre Hub\x1b[0m — PostgreSQL database manager");
    println!("");
    println!("  \x1b[1mOpen\x1b[0m  →  \x1b[36mhttp://localhost:{}\x1b[0m", args.port);
    println!("  Mode  →  {}", mode_label);
    println!("");

    let listener = TcpListener::bind(addr).await.unwrap_or_else(|_| {
        eprintln!("");
        eprintln!("  \x1b[31m✖ Port {} is already in use.\x1b[0m", args.port);
        eprintln!("");
        eprintln!("    pg-admin --port 9090");
        eprintln!("");
        std::process::exit(1);
    });
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await.unwrap();
}
