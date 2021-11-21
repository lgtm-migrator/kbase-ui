import { Component } from 'react';
import { AppCellIcon } from '../../Icon';
import { AuthInfo } from '../../../../../contexts/Auth';
import { Config } from '../../../../../types/config';
import { AppCell } from '../../../utils/NarrativeModel';
import marked from 'marked';
import DOMPurify from 'dompurify';
import { Accordion, Col, Row, Tab, Table, Tabs } from 'react-bootstrap';
import styles from './AppCell.module.css';
import cellStyles from './cell.module.css';
import Empty from '../../../../../components/Empty';
import { niceElapsed } from '../../../../../lib/time';
import RenderJSON from '../../../../../components/RenderJSON';

interface PreviewCellProps {
    cell: AppCell;
    authInfo: AuthInfo;
    config: Config;
}

export default class AppCellView extends Component<PreviewCellProps> {
    renderDescription(description: string | null) {
        if (description === null || description.trim().length === 0) {
            return <div style={{ fontStyle: 'italic' }}>no description</div>;
        }
        return (
            <div
                dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(marked(description)),
                }}
            />
        );
    }

    renderInfo() {
        const {
            app: {
                id,
                version,
                spec: {
                    info: { subtitle },
                    full_info,
                },
            },
        } = this.props.cell.metadata.kbase.appCell;
        const description = (() => {
            if (typeof full_info !== 'undefined') {
                return full_info.description;
            }
            return null;
        })();
        return (
            <>
                <div className={styles.id}>
                    <a
                        href={`/#spec/type/${id}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {id} ({version})
                    </a>
                </div>
                <div className={styles.subtitle}>{subtitle}</div>
                <div className={styles.description}>
                    {this.renderDescription(description)}
                </div>
            </>
        );
    }

    renderParams() {
        if (!('params' in this.props.cell.metadata.kbase.appCell)) {
            return <Empty message="No Params" />;
        }
        return (
            <RenderJSON value={this.props.cell.metadata.kbase.appCell.params} />
        );
    }

    renderJobStats() {
        if (!('exec' in this.props.cell.metadata.kbase.appCell)) {
            return <Empty message="No Job Stats" />;
        }
        const { status, created, queued, running, finished } =
            this.props.cell.metadata.kbase.appCell.exec.jobState;

        return (
            <Table size="sm">
                <tbody>
                    <tr>
                        <th>Status</th>
                        <td>{status}</td>
                    </tr>
                    <tr>
                        <th>Queued</th>
                        <td>{niceElapsed(queued - created).label}</td>
                    </tr>
                    <tr>
                        <th>Run</th>
                        <td>
                            {running !== null
                                ? niceElapsed(running - queued).label
                                : 'n/a'}
                        </td>
                    </tr>
                </tbody>
            </Table>
        );
    }

    render() {
        const icon = (
            <AppCellIcon
                appId={this.props.cell.metadata.kbase.appCell.app.id}
                authInfo={this.props.authInfo}
                config={this.props.config}
                appTag={this.props.cell.metadata.kbase.appCell.app.tag}
            />
        );
        // const title = this.props.title;
        // const subtitleRaw = this.props.subtitle || '';
        // eslint-disable-next-line new-cap
        // let subtitle = DOMPurify.sanitize(marked(subtitleRaw), {
        //   ALLOWED_TAGS: [],
        // });
        // if (subtitle.startsWith(title)) {
        //   subtitle = subtitle.slice(title.length);
        // }
        const {
            app: {
                version,
                spec: {
                    info: { name },
                },
            },
        } = this.props.cell.metadata.kbase.appCell;

        // const theSubtitle = (() => {
        //     if (subtitle) {
        //         if (subtitle.startsWith(title)) {
        //             return subtitle.slice(title.length);
        //         }
        //         return subtitle;
        //     }
        //     return null;
        // })();
        return (
            <div className={`row my-2 g-0 ${styles.AppCell}`}>
                <div className="col-md-2 d-flex flex-column align-items-center justify-content-start">
                    <div>{icon}</div>
                    <div
                        style={{
                            fontSize: '80%',
                            color: 'rgb(150 150 150)',
                            fontStyle: 'italic',
                            textAlign: 'center',
                        }}
                    >
                        app
                    </div>
                </div>
                <div className="col" style={{ minWidth: 0 }}>
                    <Accordion>
                        <Accordion.Item eventKey="0">
                            <Accordion.Header>
                                <div className={cellStyles.header}>
                                    <div className={cellStyles.title}>
                                        {name}{' '}
                                    </div>
                                    <div className={cellStyles.subtitle}>
                                        version {version}
                                    </div>
                                    {/* <div className={styles.title}>{title}</div> */}
                                </div>
                            </Accordion.Header>
                            <Accordion.Body>
                                <Tabs variant="tabs" defaultActiveKey="info">
                                    <Tab eventKey="info" title="Info">
                                        {this.renderInfo()}
                                    </Tab>
                                    <Tab eventKey="params" title="Params">
                                        {this.renderParams()}
                                        {/* params here... */}
                                    </Tab>
                                    <Tab eventKey="jobstats" title="Job Stats">
                                        {this.renderJobStats()}
                                    </Tab>
                                </Tabs>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </div>
            </div>
        );
    }
}
