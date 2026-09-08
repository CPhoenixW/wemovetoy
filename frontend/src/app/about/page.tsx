import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "惟®木|WeMove®品牌简介 · WEMOVE",
};

const BRAND_INTRO =
  "惟®木|WeMove®是一家专注于高精度木质轨道积木及实木产品研发与生产的科技型企业，生产基地位于杭州市西湖区，占地约5亩，建有标准化厂房2000平方米，为国家科技创新基金项目承担单位。为保障产品持续稳定的精度与优良表面品质，严选FSC 100%认证德国优质榉木作为核心原料，并通过长期自然养生工艺处理，从源头提升并稳定木材性能。产品依托智能化生产体系打造，轨道结构采用空间螺旋线设计理念，结合高精度数控铣削设备，实现一体化精密成型加工。品牌深度融合科研创新能力与STEAM教育理念，将工程思维与儿童探索体验相结合，使每一款积木既呈现精工实木的品质质感，又兼具探索性与趣味性的教育属性，广泛受到用户喜爱。";

export default function AboutPage() {
  return (
    <section className="page-shell about">
      <p className="eyebrow">About Us</p>
      <h1 className="about__title">惟®木|WeMove®品牌简介</h1>
      <div className="about__image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/company.png"
          alt="惟®木 WeMove 公司展示图"
          width={1288}
          height={852}
        />
      </div>
      <p className="about__intro">{BRAND_INTRO}</p>
    </section>
  );
}
