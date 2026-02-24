type SectionHeadingProps = {
    tag: string;
    title: string;
    description?: string;
};

export default function SectionHeading({ tag, title, description }: SectionHeadingProps) {
    return (
        <header className="section-heading">
            <span className="tag">{tag}</span>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
        </header>
    );
}
