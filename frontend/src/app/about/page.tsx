import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "惟®木|WeMove®品牌简介 · WEMOVE",
};

interface BrandSection {
  id: string;
  no: string;
  title: string;
  lead: string;
  points: string[];
  flip?: boolean;
  image: { src: string; alt: string };
}

/**
 * 品牌页四小节：品牌主张 / 材料与工艺 / 教育价值 / 生产能力。
 * 每节 = 一句话主旨 + 三条短句，配公司展示图穿插；正文为展示层文案。
 */
const BRAND_INTRO =
  "惟®木|WeMove® 专注于高精度木质轨道积木及实木产品的研发与生产，深度融合科研创新能力与 STEAM 教育理念，使每一款积木既呈现精工实木的品质质感，又兼具探索性与趣味性的教育属性。";

const SECTIONS: BrandSection[] = [
  {
    id: "philosophy",
    no: "01",
    title: "品牌主张",
    lead: "每一件积木，都希望让孩子在亲手搭建中亲近木料、理解真实的结构。",
    points: [
      "以精工实木为媒介，还原玩具的温润触感与秩序之美；",
      "把工程思维与儿童探索乐趣，认真做进每一款产品；",
      "坚持长期主义，让玩具经得起反复拼搭与时间检验。",
    ],
    image: {
      src: "/company.png",
      alt: "惟®木 WeMove 公司展示图",
    },
  },
  {
    id: "craft",
    no: "02",
    title: "材料与工艺",
    lead: "原料的真诚与工艺的严谨，决定了轨道运转时的顺滑手感。",
    points: [
      "严选 FSC 100% 认证的德国优质榉木作为核心原料；",
      "木材经长期自然养生处理，从源头稳定性能、抑制变形开裂；",
      "空间螺旋线轨道设计，配合高精度数控铣削一体化精密成型。",
    ],
    flip: true,
    image: {
      src: "/public5.png",
      alt: "榉木原料与高精度加工工艺",
    },
  },
  {
    id: "education",
    no: "03",
    title: "教育价值",
    lead: "好玩是表象，藏在背后的是可以迁移的工程与空间思维。",
    points: [
      "将工程思维与儿童探索体验相结合；",
      "鼓励试错与重构，在拼搭中理解结构、受力与传动；",
      "兼顾探索性与趣味性，陪伴不同年龄段的成长。",
    ],
    image: {
      src: "/public6.png",
      alt: "儿童动手拼搭场景",
    },
  },
  {
    id: "production",
    no: "04",
    title: "生产能力",
    lead: "稳定的交付，来自可控的场地、设备与生产体系。",
    points: [
      "生产基地位于杭州市西湖区，占地约 5 亩；",
      "建有约 2000 平方米标准化厂房与智能化生产体系；",
      "为国家科技创新基金项目承担单位。",
    ],
    flip: true,
    image: {
      src: "/public7.png",
      alt: "惟®木 WeMove 智能化生产基地",
    },
  },
];

export default function AboutPage() {
  return (
    <section className="page-shell about">
      <p className="eyebrow">关于我们</p>
      <h1 className="about__title">惟®木|WeMove®品牌简介</h1>
      <p className="about__intro">{BRAND_INTRO}</p>

      <div className="about-sects">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className={section.flip ? "about-sect is-flip" : "about-sect"}
          >
            <div className="about-sect__body">
              <p className="about-sect__no">{section.no}</p>
              <h2 className="about-sect__title">{section.title}</h2>
              <p className="about-sect__lead">{section.lead}</p>
              <ul className="about-sect__points">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div className="about-sect__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.image.src} alt={section.image.alt} />
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
