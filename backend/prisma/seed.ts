import { PrismaClient, UserRole } from '@prisma/client';
import { ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'ChangeMe123!';

const seedUsers: Array<{
  email: string;
  name: string;
  role: UserRole;
}> = [
  { email: 'user@wemove.local', name: 'Demo User', role: UserRole.USER },
  { email: 'dealer@wemove.local', name: 'Demo Dealer', role: UserRole.DEALER },
  { email: 'admin@wemove.local', name: 'Demo Admin', role: UserRole.ADMIN },
];

const seedProducts = [
  {
    name: '50块标准款套装',
    slug: '50-piece-std-set',
    shortDescription: '经典50块积木套装，适合创意搭建',
    description: '包含50块标准尺寸积木，可搭建房屋、车辆等多种造型，激发儿童创造力。',
    price: 29.99,
    dealerPrice: 22.49,
    ageMin: 3,
    ageMax: 10,
    playEnvironment: 'indoor',
    status: ProductStatus.ACTIVE,
    features: ['安全环保材质', '兼容主流积木', '培养空间思维'],
    specifications: { material: 'ABS塑料', blockCount: 50, ageRange: '3+' },
  },
  {
    name: 'Cugolino Basic',
    slug: 'cugolino-basic',
    shortDescription: 'Cugolino基础款积木，德国设计',
    description: 'Cugolino系列基础套装，圆润安全，色彩丰富，适合初学者入门。',
    price: 34.99,
    dealerPrice: 26.24,
    ageMin: 4,
    ageMax: 12,
    playEnvironment: 'indoor',
    status: ProductStatus.ACTIVE,
    features: ['德国设计', '圆润安全', '色彩丰富'],
    specifications: { material: '高品质塑料', ageRange: '4+' },
  },
  {
    name: '大摆锤套',
    slug: 'large-pendulum-set',
    shortDescription: '大摆锤机械结构套装',
    description: '通过大摆锤演示动能与势能的转换，寓教于乐。',
    price: 49.99,
    dealerPrice: 37.49,
    ageMin: 8,
    ageMax: 15,
    playEnvironment: 'indoor',
    status: ProductStatus.ACTIVE,
    features: ['机械原理演示', '动手组装', '科学教育'],
    specifications: { material: '塑料+金属', ageRange: '8+' },
  },
  {
    name: '小转盘套',
    slug: 'small-turntable-set',
    shortDescription: '小转盘机械套装，展示齿轮传动原理',
    description: '迷你转盘结构，展示齿轮传动原理，了解旋转运动。',
    price: 39.99,
    dealerPrice: 29.99,
    ageMin: 6,
    ageMax: 12,
    playEnvironment: 'indoor',
    status: ProductStatus.ACTIVE,
    features: ['齿轮传动', '旋转原理', '动手组装'],
    specifications: { material: '塑料', ageRange: '6+' },
  },
  {
    name: '电梯模型',
    slug: 'elevator-model',
    shortDescription: '模拟电梯升降原理',
    description: '模拟电梯升降原理，了解滑轮和绳索机械结构。',
    price: 59.99,
    dealerPrice: 44.99,
    ageMin: 8,
    ageMax: 14,
    playEnvironment: 'indoor',
    status: ProductStatus.ACTIVE,
    features: ['真实模拟', '滑轮原理', '结构工程'],
    specifications: { material: '塑料+线绳', ageRange: '8+' },
  },
  {
    name: '电磁炮',
    slug: 'electromagnetic-cannon',
    shortDescription: '电磁炮科学实验套装',
    description: '利用电磁原理发射"炮弹"，探索电磁力的奥秘。',
    price: 69.99,
    dealerPrice: 52.49,
    ageMin: 10,
    ageMax: 16,
    playEnvironment: 'indoor',
    status: ProductStatus.ACTIVE,
    features: ['电磁原理', '科学实验', '动手操作'],
    specifications: { material: '塑料+电子元件', ageRange: '10+' },
  },
  {
    name: '蛇形套装',
    slug: 'snake-set',
    shortDescription: '蛇形传动结构套装，仿生设计',
    description: '模仿蛇形运动的机械结构，展示连杆传动原理。',
    price: 44.99,
    dealerPrice: 33.74,
    ageMin: 7,
    ageMax: 12,
    playEnvironment: 'indoor',
    status: ProductStatus.ACTIVE,
    features: ['仿生设计', '连杆传动', '结构工程'],
    specifications: { material: '塑料', ageRange: '7+' },
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  console.log(`Seeded ${seedUsers.length} development users.`);

  // 创建分类
  const category = await prisma.category.upsert({
    where: { slug: 'building-blocks' },
    update: {},
    create: {
      name: '积木玩具',
      slug: 'building-blocks',
      description: '创意积木玩具系列，培养动手能力和创造力',
      isActive: true,
    },
  });

  console.log(`Category created: ${category.name}`);

  // 创建用户
  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });
  }
  console.log(`Seeded ${seedUsers.length} development users.`);

  // 创建商品
  for (const productData of seedProducts) {
    await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: {
        ...productData,
        categoryId: category.id,
      },
    });
  }
  console.log(`Seeded ${seedProducts.length} products.`);
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
