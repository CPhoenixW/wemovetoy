import { PrismaClient, UserRole, ProductStatus, VariantStatus } from '@prisma/client';
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
    shortDescription: '德国进口AA级榉木材料，通过先进的曲线烘干技术，使积木产品材质刚硬、木纹美观、环保。',
    description: '这款50块标准款实木滚珠轨道积木，以天然榉木打造，温润无漆，边角圆润安全。积木自带凹槽、弯道、圆孔等轨道结构，可自由拼接成立体迷宫或城堡式滚珠路径，让彩色玻璃珠在重力驱动下穿梭滑行，在搭建与试玩中锻炼空间思维与逻辑能力，同时可与同品牌机关套兼容拓展，是兼具质感与教育价值的开放式益智玩具。',
    price: 29.99,
    dealerPrice: 22.49,
    ageMin: 3,
    ageMax: 10,
    playEnvironment: 'indoor',
    status: ProductStatus.ACTIVE,
    features: ['安全环保材质', '兼容主流积木', '培养空间思维'],
    specifications: { material: '德国AA级榉木', blockCount: 50, ageRange: '3+' },
  },
  {
    name: 'Cugolino Basic',
    slug: 'cugolino-basic',
    shortDescription: '易拼接融入建筑，美学启蒙空间思维。',
    description: '作为"基础套"，它摒弃了复杂的机械机关，聚焦滚珠轨道的核心拼接逻辑，组件以"基础轨道+支撑结构+趣味节点"为核心，包含直轨、弯轨、分叉轨等基础轨道块，以及带圆孔的穿透式积木、弧形过渡件，可自由拼接成平面或立体的滚珠路径，图中可见水平轨道、爬坡轨道与转弯轨道的组合，形成了闭环式的滑行路线。',
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
    shortDescription: '原木无漆，立体轨道构建。',
    description: '图中的长斜坡是轨道的主体，小球可以从高处滑下，通过各种机关。旁边的"大摆锤"结构，就是一个可以摆动的木质装置，当小球经过时，摆锤会被触发，实现小球的传递或转向，这也是它名字的由来。',
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
    shortDescription: '可与其他套装积木组合搭建。',
    description: '最具特色的是顶部的弧形凹槽转盘结构。当彩色小球滚入这个凹槽后，会在转盘里滚动、停留，甚至可以通过巧妙的设计实现转向或触发下一段轨道，这也是它被称为"小转盘套"的原因。',
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
    shortDescription: '拼装简单，适合儿童；齿轮联动，机械感十足；多轨道循环，行云流水般丝滑。',
    description: '电梯积木是一款设计巧妙的玩具，允许孩子们通过构建和操作模拟电梯系统来理解机械原理和物理法则。这种积木套装通常包含多个部件，使得小朋友可以自行组装电梯，并体验通过手动或电动控制让电梯上下移动的过程。',
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
    shortDescription: '木制安全无异味，咔哒磁吸声，拼搭中玩出小智慧。',
    description: '磁力炮积木是一款创新的玩具，利用磁力原理，让孩子们通过构建能够发射小球的机械装置，从而探索物理学的魅力。这款积木不仅增强了儿童对科学的兴趣，还激发了他们的工程技能和问题解决能力。',
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
    shortDescription: '蛇形轨道，蜿蜒缠绵，丰富积木玩法，直观展示弹珠滚动轨迹。',
    description: '蛇形套装积木是一款极具创意的玩具，依托蜿蜒曲折的轨道设计，让孩子们在拼搭与玩赏中，直观探索物体运动的轨迹规律与空间路径逻辑。',
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

  // 创建商品
  for (const productData of seedProducts) {
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: {
        ...productData,
        categoryId: category.id,
      },
    });
    // 在创建商品后添加 SKU，重复运行种子时保留现有数据。
    await prisma.variant.createMany({
      data: [
        {
          productId: product.id,
          sku: `${productData.slug}-basic`,
          name: '基础款',
          options: { version: '基础' },
          price: productData.price,
          dealerPrice: productData.dealerPrice,
          stock: 80,
          reserved: 0,
          status: VariantStatus.ACTIVE,
        },
        {
          productId: product.id,
          sku: `${productData.slug}-pro`,
          name: '进阶款',
          options: { version: '进阶' },
          price: productData.price * 1.2,
          dealerPrice: productData.dealerPrice * 1.2,
          stock: 30,
          reserved: 0,
          status: VariantStatus.ACTIVE,
        },
      ],
      skipDuplicates: true,
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
