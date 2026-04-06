import { AppDataSource } from './AppDataSource.js';
import { Usuario, PerfilUsuario } from '../entities/Usuario.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function seed() {
  try {
    console.log("Iniciando conexão com o banco de dados...");
    await AppDataSource.initialize();

    const userRepo = AppDataSource.getRepository(Usuario);

    // Dados do Gestor (Lendo do .env com fallbacks de segurança para a coleção do Postman)
    const emailGestor = process.env.SEED_USER_EMAIL || "gestor@lotepim.com";
    const senhaLimpa = process.env.SEED_USER_PASSWORD || "senha123";

    const existe = await userRepo.findOne({ where: { email: emailGestor } });

    if (existe) {
      console.log(`Usuário '${emailGestor}' já existe.`);
    } else {
      console.log(`Criando usuário gestor: ${emailGestor}`);

      const senha_hash = await bcrypt.hash(senhaLimpa, SALT_ROUNDS);

      const gestor = userRepo.create({
        nome: "Gestor Inicial",
        email: emailGestor,
        senha_hash: senha_hash,
        perfil: PerfilUsuario.GESTOR,
        ativo: true
      });

      await userRepo.save(gestor);
      console.log("Usuário gestor criado com sucesso!");
    }

  } catch (error) {
    console.error("Erro ao rodar o seed:", error);
  } finally {
    await AppDataSource.destroy();
    console.log("Conexão encerrada.");
    process.exit(0);
  }
}

seed();
