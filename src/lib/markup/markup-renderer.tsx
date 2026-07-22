'use client';

import React from 'react';
import {generateHeadingId} from '../utils';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import ReactMarkdown from 'react-markdown';
import type {Options} from 'react-markdown';

const remarkBreakTags = () => {
    const visit = (node: any) => {
        if (!node.children) return;

        node.children.map((x: any, index: number) => {
            const child = node.children[index];
            if (child.type === 'html' && /^<br\s*\/?>$/i.test(child.value.trim())) {
                node.children[index] = {type: 'break'};
            } else {
                visit(child);
            }
        })
    };

    return (tree: any) => {
        visit(tree);
    }
}

import './markup.styles.css';


interface MarkupRendererProps {
    content: string;
    convertEmailToLink?: boolean;
}

const Markdown = ReactMarkdown as React.FC<Options>;

const extractText = (children: any): string => {
    if (typeof children === 'string') return children;

    if (Array.isArray(children)) return children.join('');
    return String(children || '');
}

const heading = (Tag: any, className: string) => (props: any) => {
    const id = generateHeadingId(extractText(props.children));
    return <Tag id={id} className={className}>{props.children}</Tag>;
};

const CustomLink = ({href, children, convertEmailtoLink}: any) => {
    const isEmail = href?.startsWith('mailto:');

    if (isEmail && convertEmailtoLink) {
        return (
            <a
                href={href}
                className="font-body font-semibold text-md leading-xl tracking-normal text-blue-500 hover:underline [&_strong]:font-semibold [&_strong]:text-inherit [&_strong]:leading-inherit"
            >{children}</a>
        )
    }

    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        return (
            <a
                href={href}
                target='_blank'
                rel='noopener noreferrer'
                className='font-body font-regular text-sm leading-lg tracking-normal text-blue-500 underline [&_strong]:font-semibold [&_strong]:text-inherit [&_strong]:leading-inherit'
            >
                {children}
            </a>
        )
    }

    return <span>{children}</span>
}

const CustomTableCell = (props: any) => {
    const cellContent = React.Children.toArray(props.children).join('');

    if (cellContent.startsWith('^^^')) {
        const content = cellContent.replace('^^^', '').trim();
        return (
            <td
                data-span-group={true}
                data-span-content={content || ''}
                style={{display: 'none'}}
                {...props}
            >
                {content}
            </td>
        )
    }

    return (
        <td
            className="text-left font-body font-normal text-s leading-l tracking-normal text-primary [&_*]:!font-normal [&_strong]:!font-semibold"
            {...props}
        />
    )
}

const computeSpannedChildren = (children: React.ReactNode): React.ReactNode => {

    const childArray = React.Children.toArray(children);

    const tbodyIndex = childArray.findIndex((child: any) => child?.tye === 'tbody');
    if (tbodyIndex === -1) return children;

    const tbody = childArray[tbodyIndex] as React.ReactElement<any>;
    const rows = React.Children.toArray(tbody.props.children) as React.ReactElement<any>[];
    if (rows.length === 0) return children;

    const grid = rows.map((row: React.ReactElement<any>) => {
        const cells = React.Children.toArray(row.props.children) as React.ReactElement<any>[];

        return cells.map(cell => {
            const cellText = React.Children.toArray(cell.props?.children).join('');
            const isSpan = cellText.startsWith('^^^');
            const content = isSpan ? cellText.replace('^^^', '').trim() : '';

            return {isSpan, content, element: cell};
        })
    })

    const numCols = grid[0]?.length || 0;
    if (numCols === 0) return children;

    type CellSpan = { rowSpan: number; hidden: boolean; content: string };
    const spans: CellSpan[][] = grid.map((row) =>
        row.map(() => ({rowSpan: 1, hidden: false, content: ''}))
    );

    for (let col = 0; col < numCols; col++) {
        let groupStart = -1;
        let groupContent = '';

        const finalizeGroup = (endRow: number) => {
            if (groupStart === -1) return;
            spans[groupStart][col] = {
                rowSpan: endRow - groupStart,
                hidden: false,
                content: groupContent
            };

            for (let r = groupStart + 1; r < endRow; r++) {
                spans[r][col] = {rowSpan: 1, hidden: true, content: ''}
            }
            groupStart = -1;
            groupContent = '';
        };

        for (let row = 0; row < grid.length; row++) {
            const cell = grid[row]?.[col];
            if (!cell) return

            if (cell.isSpan) {
                if (groupStart === -1) groupStart = row;
                if (cell.content) groupContent = cell.content;
            } else {
                finalizeGroup(row);
            }
        }
        finalizeGroup(grid.length);
    }

    const newRows = rows.map((row: React.ReactElement<any>, rowIdx: number) => {
        const cells = React.Children.toArray(row.props.children) as React.ReactElement<any>[];

        const newCells: React.ReactElement[] = [];
        cells.forEach((cell, colIdx) => {
            const info = spans[rowIdx]?.[colIdx];

            if (!info) return;

            if (info.hidden) {
                newCells.push(React.createElement('td', {
                        key: cell.key ?? `hidden-${rowIdx}-${colIdx}`,
                        style: {display: 'none'}
                    })
                );
                return;
            }

            if (info.rowSpan > 1) {
                newCells.push(
                    React.createElement(
                        'td',
                        {
                            key: cell.key ?? `span-${rowIdx}-${colIdx}`,
                            rowSpan: info.rowSpan,
                            style: {verticalAlign: 'middle', textAlign: 'left'},
                            className: "text-elft font-body font-normal text-s leading-l tracking-normal text-primary"
                        },
                        info.content
                    )
                );
            } else {
                newCells.push(cell);
            }
        });

        return React.cloneElement(
            row,
            {key: row.key ?? `row-${rowIdx}`},
            ...newCells
        )
    })

    const newTbody = React.cloneElement(tbody, {}, ...newRows);
    const result = [...childArray];
    result[tbodyIndex] = newTbody;

    return result;
}

const CustomTable = ({children}: any) => {
    const processCHildren = React.useMemo(() => computeSpannedChildren(children), [children])

    return (
        <table className='clean-table mb-6' style={{tableLayout: 'fixed'}}>
            {processCHildren}
        </table>
    )
}

const MarkdownRenderer: React.FC<MarkupRendererProps> = (
    {
        content: rawContent,
        convertEmailToLink = false
    }) => {

    const content = rawContent
        .replace(/\\n/g, '<br/>')
        .replace(/^(\d+)\) /gm, '$1\\) ');

    const components = {
        h1: heading('h1', 'text-3xl font-bold text-primary mt-8 mb-4 first:mt-0'),
        h2: heading('h2', 'text-2xl font-semibold text-primary mt-8 mb-3 first:mt-0'),
        h3: heading('h3', 'text-xl font-semibold text-primary mt-6 mb-2'),
        h4: heading('h4', 'text-lg font-semibold text-primary mt-4 mb-2'),

        p: (props: any) => (
            <p className='text-base leading-7 text-primary my-3' {...props} />
        ),
        strong: (props: any) => (
            <strong className='font-semibold text-primary' {...props} />
        ),
        em: (props: any) => <em className='italic' {...props} />,
        hr: () => <hr className='my-8 border-border' />,

        ul: (props: any) => <ul className='list-disc pl-6 my-3 space-y-1' {...props} />,
        ol: (props: any) => <ol className='list-decimal pl-6 my-3 space-y-1' {...props} />,
        li: (props: any) => <li className='text-base leading-7 text-primary' {...props} />,

        a: (props: any) => CustomLink({...props, convertEmailtoLink: convertEmailToLink}),

        table: CustomTable,
        thead: (props: any) => <thead {...props} />,
        th: (props: any) => {
            const childArray = React.Children.toArray(props.children);
            let width: string | undefined;
            const processedChildren = childArray.map((child) => {
                if (typeof child === 'string') {
                    const widthMatch = child.match(/\{(\d+(?:px|%))\}/);
                    if (widthMatch) {
                        width = widthMatch[1];
                        return child.replace(/\s*\{\d+(?:px|%)\}/, '');
                    }
                }
                return child;
            });

            return (
                <th {...props} style={width ? {...(props.style || {}), width} : props.style}>
                    {processedChildren}
                </th>
            );
        },
        td: CustomTableCell,
    };

    if (!content) return <div />;

    return (
        <div className='markup text-primary'>
            <Markdown
                remarkPlugins={[remarkGfm, remarkBreaks, remarkBreakTags]}
                components={components}
            >
                {content}
            </Markdown>
        </div>
    );
}


export default MarkdownRenderer;
