import { Component } from 'react';
import './MessageAlert.css';

export interface ErrorAlertProps {
    title?: string;
    type: 'error' | 'info' | 'warning' | 'success';
    message: string;
    render?: () => JSX.Element;
}

export default class ErrorAlert extends Component<ErrorAlertProps> {
    renderIcon() {
        switch (this.props.type) {
            case 'error':
                return 'fa-exclamation-triangle';
            case 'warning':
                return 'fa-exclamation';
            case 'info':
                return 'fa-info';
            case 'success':
                return 'fa-check';
        }
    }
    renderAlertTypeClass() {
        switch (this.props.type) {
            case 'error':
                return 'danger';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            case 'success':
                return 'success';
        }
    }
    defaultTitle() {
        switch (this.props.type) {
            case 'error':
                return 'Error!';
            case 'warning':
                return 'Warning!';
            case 'info':
                return 'Info';
            case 'success':
                return 'Success';
        }
    }
    renderTitle() {
        const title = this.props.title || this.defaultTitle();
        return (
            <div className="alert-title">
                <span className={`fa ${this.renderIcon()}`} />
                {title}
            </div>
        );
    }
    render() {
        const content = (() => {
            if (this.props.render) {
                return this.props.render();
            }
            return this.props.message || this.props.children;
        })();
        return (
            <div
                className={`alert alert-${this.renderAlertTypeClass()} MessageAlert`}
            >
                {this.renderTitle()}
                {content}
            </div>
        );
    }
}
